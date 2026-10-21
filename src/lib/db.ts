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

/** Leaderboard: BKN tie-breaker (total → TKP → TIU → TWK → duration) */
export async function getPackageLeaderboard(packageId: string, limit = 50) {
  const sql = getDb();
  if (!sql) return [];
  return sql`
    SELECT
      er.id,
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
    ORDER BY
      er.total_score DESC,
      er.score_tkp DESC,
      er.score_tiu DESC,
      er.score_twk DESC,
      er.duration_used ASC
    LIMIT ${limit}
  `;
}
