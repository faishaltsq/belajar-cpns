import { neon, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';

neonConfig.fetchConnectionCache = true;

// FIX P2-12: getDb() used to return neon(url) no matter what — that driver
// rewrites the connection string into an HTTPS endpoint, so a plain Postgres
// URL failed with `TypeError: Invalid URL` (or `https://api.<ip>/sql`).
// Transport is now negotiated per connection string:
// - host under .neon.tech  -> neon() HTTP-per-query (production path unchanged)
// - anything else          -> TCP `pg` Pool (verified against Docker Postgres)
// Both expose the same tagged-template `sql` shape every call site already
// uses, so no call site changes. The pg Pool is processed and cached; nothing
// in this codebase opens a transaction, same constraint as the HTTP path.

const NEON_HOST_RE = /\.neon\.tech$/i;

export function resolveTransport(url: string): 'neon-http' | 'postgres-tcp' {
  try {
    return NEON_HOST_RE.test(new URL(url).hostname) ? 'neon-http' : 'postgres-tcp';
  } catch {
    return 'postgres-tcp';
  }
}

// `query` is the "raw text" escape hatch used by admin/migrate. The Neon HTTP
// driver types it as (text, params) and the pg branch below supplies its own,
// so it is declared leniently here rather than at 14 call sites.
type SqlLike = ((
  strings: readonly string[],
  ...values: unknown[]
) => Promise<any[]>) & { query: (text: string, values?: unknown[]) => Promise<any[]> };

let pgPool: PgPool | null = null;

function ensurePool(url: string): PgPool {
  if (!pgPool) {
    pgPool = new PgPool({ connectionString: url, max: 10, connectionTimeoutMillis: 15000 });
  }
  return pgPool;
}

export function getDb(): SqlLike | null {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;

  if (resolveTransport(url) === 'neon-http') {
    return neon(url) as unknown as SqlLike;
  }

  const runQuery = async (text: string, values: unknown[] = []) => {
    const r = await ensurePool(url).query(text, values as never[]);
    return r.rows;
  };

  const sql = Object.assign(
    (strings: readonly string[], ...values: unknown[]) =>
      runQuery(
        strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ''), ''),
        values
      ),
    { query: (text: string, values: unknown[] = []) => runQuery(text, values) }
  );
  return sql;
}

export async function isDbConnected(): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    const result = await sql`SELECT 1 as connected`;
    return Boolean(result?.[0]?.connected === 1);
  } catch {
    return false;
  }
}

/** Save exam result, returns id */
export async function saveExamResult(data: {
  userId?: string;
  packageId: string;
  answers: Record<string, string>;
  scoreTwk: number;
  scoreTiu: number;
  scoreTkp: number;
  totalScore: number;
  isPassed: boolean;
  durationUsed?: number;
  startedAt?: Date;
}): Promise<string | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const result = await sql`
      INSERT INTO exam_results
        (user_id, package_id, answers, score_twk, score_tiu, score_tkp, total_score, is_passed, duration_used, started_at)
      VALUES
        (${data.userId || null}, ${data.packageId}, ${JSON.stringify(data.answers)}::jsonb,
         ${data.scoreTwk}, ${data.scoreTiu}, ${data.scoreTkp}, ${data.totalScore},
         ${data.isPassed}, ${data.durationUsed || null}, ${data.startedAt?.toISOString() || null})
      RETURNING id
    `;
    return result[0]?.id ?? null;
  } catch {
    return null;
  }
}

/** Get last N results for a user */
export async function getUserResults(userId: string, limit = 10) {
  const sql = getDb();
  if (!sql) return [];
  return sql`
    SELECT id, package_id, total_score, is_passed, finished_at
    FROM exam_results
    WHERE user_id = ${userId}
    ORDER BY finished_at DESC
    LIMIT ${limit}
  `;
}

// ── Auth helpers (Neon) ──

export type DbUser = {
  id: string;
  email: string;
  phone: string | null;
  password_hash: string;
  name: string;
  created_at: string;
  is_pro?: boolean;
  pro_activated_at?: string | null;
  target_instansi?: string | null;
  target_formasi?: string | null;
};

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`;
  return (rows[0] as DbUser) ?? null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`SELECT id, email, phone, name, created_at FROM users WHERE id = ${id} LIMIT 1`;
  return (rows[0] as DbUser) ?? null;
}

export async function createUser(email: string, passwordHash: string, name: string): Promise<DbUser> {
  const sql = getDb();
  if (!sql) throw new Error('Database not configured');
  const rows = await sql`
    INSERT INTO users (email, password_hash, name) VALUES (${email.toLowerCase()}, ${passwordHash}, ${name})
    RETURNING *
  `;
  return rows[0] as DbUser;
}

/**
 * Leaderboard per paket.
 *
 * Dua hal yang sebelumnya salah dan sekarang dijaga di sini:
 *
 * 1. Papan ini milik SATU paket. `WHERE er.package_id = $1` adalah satu-satunya
 *    filter yang menentukan isi papan — skor tryout-4 tidak pernah muncul di
 *    peringkat tryout-mini, sekalipun nilainya lebih tinggi.
 *
 * 2. Peringkat dihitung per PESERTA, bukan per baris `exam_results`. Dulu satu
 *    user yang mengerjakan paket yang sama lima kali menempati lima baris dan
 *    mendorong peserta lain keluar dari 50 besar — jadi "semua user bisa masuk"
 *    tidak benar. Sekarang tiap peserta diwakili percobaan TERBAIKNYA
 *    (`ROW_NUMBER() ... attempt_no = 1`) dan jumlah percobaannya tetap
 *    dilaporkan lewat `attempt_count`.
 *
 * Tamu tidak punya identitas, jadi tiap hasil tamu berdiri sebagai pesertanya
 * sendiri (`anon:<result id>`) — tidak ada cara menggabungkannya tanpa akun.
 *
 * Urutan peringkat = tie-breaker BKN (Kepmen PANRB 321/2024): total → TKP →
 * TIU → TWK → durasi tercepat, diterapkan langsung pada ORDER BY di query ini.
 * `RANK()` dipakai supaya nilai yang benar-benar identik berbagi
 * peringkat, bukan mendapat nomor acak.
 *
 * `userId` / `resultId` opsional: kalau diisi, baris milik pemanggil ikut
 * dikembalikan walau peringkatnya di luar `limit`, sehingga setiap user selalu
 * bisa melihat posisinya di papan nasional.
 */
export interface LeaderboardRow {
  rank: number;
  user_id: string | null;
  user_name: string | null;
  total_score: number;
  score_tkp: number;
  score_tiu: number;
  score_twk: number;
  duration_used: number | null;
  is_passed: boolean;
  finished_at: string;
  attempt_count: number;
}

export interface PackageLeaderboard {
  rows: LeaderboardRow[];
  me: LeaderboardRow | null;
  totalParticipants: number;
}

export interface LeaderboardQuery {
  limit?: number;
  userId?: string | null;
  resultId?: string | null;
}

const EMPTY_BOARD: PackageLeaderboard = { rows: [], me: null, totalParticipants: 0 };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `resultId` comes from the URL, so it can be any string. Casting it to uuid in
 * SQL would raise 22P02 (invalid input syntax) and turn a bad query parameter
 * into a 500; anything that is not a uuid simply matches nothing instead.
 */
function asUuidOrNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  return UUID_RE.test(value) ? value : null;
}

export async function getPackageLeaderboard(
  packageId: string,
  options: LeaderboardQuery = {}
): Promise<PackageLeaderboard> {
  const sql = getDb();
  if (!sql || !packageId) return EMPTY_BOARD;

  const limit =
    Number.isFinite(options.limit) && Number(options.limit) > 0
      ? Math.floor(Number(options.limit))
      : 50;
  const userId = asUuidOrNull(options.userId);
  const resultId = asUuidOrNull(options.resultId);

  // Database down / query gagal → papan kosong, bukan 500. Route hanya punya
  // handler 500 generik, jadi satu blip database sesaat akan mengubah seluruh
  // tab leaderboard di halaman hasil jadi kartu error — lebih baik tampilkan
  // papan kosong yang akan terisi saat fetch berikutnya.
  // result_id hanya dipakai untuk mencocokkan baris milik tamu, lalu dibuang
  // sebelum payload keluar: id hasil adalah kunci /api/results/[id]/review, dan
  // untuk baris anonim route itu tidak memeriksa kepemilikan.
  let raw;
  try {
    raw = await sql`
    WITH attempts AS (
      SELECT
        er.id AS result_id,
        er.user_id,
        COALESCE(er.user_id::text, 'anon:' || er.id::text) AS participant_key,
        er.total_score,
        er.score_tkp,
        er.score_tiu,
        er.score_twk,
        er.duration_used,
        er.is_passed,
        er.finished_at,
        u.name AS user_name
      FROM exam_results er
      LEFT JOIN users u ON er.user_id = u.id
      WHERE er.package_id = ${packageId}
    ),
    best AS (
      SELECT
        a.*,
        (ROW_NUMBER() OVER (
          PARTITION BY a.participant_key
          ORDER BY
            a.total_score DESC,
            a.score_tkp DESC,
            a.score_tiu DESC,
            a.score_twk DESC,
            a.duration_used ASC NULLS LAST,
            a.finished_at ASC
        ))::int AS attempt_no,
        (COUNT(*) OVER (PARTITION BY a.participant_key))::int AS attempt_count
      FROM attempts a
    ),
    board AS (
      SELECT
        b.*,
        (RANK() OVER (
          ORDER BY
            b.total_score DESC,
            b.score_tkp DESC,
            b.score_tiu DESC,
            b.score_twk DESC,
            b.duration_used ASC NULLS LAST,
            b.finished_at ASC
        ))::int AS rank,
        (COUNT(*) OVER ())::int AS total_participants
      FROM best b
      WHERE b.attempt_no = 1
    )
    SELECT
      rank, result_id, user_id, user_name, total_score, score_tkp, score_tiu,
      score_twk, duration_used, is_passed, finished_at, attempt_count,
      total_participants
    FROM board
    WHERE rank <= ${limit}
       OR (${userId}::uuid IS NOT NULL AND user_id = ${userId}::uuid)
       OR (${resultId}::uuid IS NOT NULL AND result_id = ${resultId}::uuid)
    ORDER BY rank ASC
  `;
  } catch {
    return EMPTY_BOARD;
  }

  if (!raw || raw.length === 0) return EMPTY_BOARD;

  // Setiap baris membawa `total_participants` yang sama (COUNT(*) OVER ()), tapi
  // mengambilnya dari baris pertama saja rapuh terhadap perubahan urutan —
  // ambil nilai terbesar supaya tetap benar apa pun urutannya.
  const totalParticipants = raw.reduce(
    (max, r) => Math.max(max, Number(r.total_participants ?? 0)),
    0
  );
  let me: LeaderboardRow | null = null;
  const rows: LeaderboardRow[] = [];

  for (const r of raw) {
    const row: LeaderboardRow = {
      rank: Number(r.rank),
      user_id: (r.user_id as string | null) ?? null,
      user_name: (r.user_name as string | null) ?? null,
      total_score: Number(r.total_score ?? 0),
      score_tkp: Number(r.score_tkp ?? 0),
      score_tiu: Number(r.score_tiu ?? 0),
      score_twk: Number(r.score_twk ?? 0),
      duration_used: r.duration_used == null ? null : Number(r.duration_used),
      is_passed: Boolean(r.is_passed),
      finished_at:
        r.finished_at instanceof Date
          ? r.finished_at.toISOString()
          : String(r.finished_at ?? ''),
      attempt_count: Number(r.attempt_count ?? 1),
    };
    rows.push(row);

    const isMine =
      (userId !== null && row.user_id === userId) ||
      (resultId !== null && String(r.result_id) === resultId);
    if (isMine && !me) me = row;
  }

  return { rows, me, totalParticipants };
}
