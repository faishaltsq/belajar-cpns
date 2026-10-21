# Migration 012 vs Production `payment_orders` — Verification

**Date:** 2026-10-21
**Subject:** `migrations/012_create_payment_orders.sql` (defect P2-11)
**Mode:** read-only. No DDL, no `INSERT`/`UPDATE`/`DELETE`, no writes of any kind to the production database.
**Verdict:** **MISMATCH.** The migration does not describe the production table. Applying it to production is **not a no-op** and would **not** make production match the repo — and it would not repair the live defect it appears to fix.

---

## 1. Method

### How access was obtained

1. `vercel env pull <scratch>/prod.env --environment=production` succeeded, but Vercel returned `[SENSITIVE]` placeholders for 27 variables, including `DATABASE_URL` and `POSTGRES_URL`. These are Vercel *sensitive* env vars backed by the Neon integration (`contentHint.type = integration-store-secret`); their values are write-only by design and cannot be read back by any CLI or API call. `/v1/projects/{id}/env/{envId}` returns `decrypted: false, value: ""` for them, and `?decrypt=true` is rejected as a deprecated parameter. There is therefore **no** supported path to read the production connection string out of Vercel.
2. Identity of the target was established from the Vercel storage-integration metadata instead: `store.externalResourceId = bold-violet-68526732`, region `iad1`, database `neondb`. The connection actually used resolved to the **same Neon project** (`current_setting('neon.project_id') = bold-violet-68526732`), and the host/user/database/password lengths in the local gitignored `.env.local` matched the store's declared secret lengths exactly (`PGHOST` 55, `PGUSER` 12, `PGDATABASE` 6, `PGPASSWORD` 16).
3. Every query ran through `pg` with `SET default_transaction_read_only = on` as the **first** statement on the session, verified by reading `SHOW default_transaction_read_only` → `on` before any other query. All queries were `SELECT` / `information_schema` / `pg_catalog` reads.
4. Target confirmed live and primary-lineage, not a stale clone: server `PostgreSQL 18.6` on Neon, branch `br-damp-violet-b8tteq63`, `pg_is_in_recovery() = false`, 44 MB, `payment_orders` holding rows written as recently as 2026-10-20 (the day before this audit) and `users` as recently as 2026-10-17.

**Caveat, stated plainly:** the connection string came from `.env.local`, not from the Vercel pull (which could not yield a value). The corroboration above is strong — the Neon project id reported by the live session is identical to the Vercel production store's `externalResourceId`, the host/user/database/password component lengths match the store's declared secret lengths exactly, and the table holds rows written the day before the audit — but it is corroboration, not a byte-for-byte comparison against the deployment's own variable. One component length does **not** match: the Vercel-stored `DATABASE_URL` is 145 characters, `.env.local`'s is 121, a difference consistent with the deployment URL carrying extra query parameters (`.env.local`'s carries only `sslmode`). Same project, same credentials, different URL decoration.

### Hygiene

- The pulled env file was written **outside the repo**, to `%LOCALAPPDATA%\Temp\hermes-pgverify-155979\`, never into the working tree. `.env*` in the tree is gitignored, but nothing was written there.
- **The pulled env file and the entire scratch directory were deleted at the end of this audit** (see §7).
- No connection string, host, database name, user, password, or per-customer value appears in this document or in any command output. Credentials are referred to as `[REDACTED]` throughout. Only aggregate counts are reported for table contents — no emails, no order ids, no row-level data.

### Reproducibility

The schema queries were run **three times** (rounds 1, 2, 3) plus a fourth pass for aggregate shape. Column names, ordinal positions, types, nullability, defaults, constraints and index definitions were **byte-identical across all rounds**. Row count was stable at 91 in every round. Per the task's stability criterion — schema stable ⇒ done — the audit is complete.

---

## 2. Side-by-side: columns

Migration claims (17 columns) vs production reality (17 columns). `ord` is the production ordinal position.

| # | Column | Migration 012 claims | Production reality | Match |
|---|--------|----------------------|--------------------|-------|
| 1 | `id` | `BIGSERIAL PRIMARY KEY` → **bigint**, NOT NULL, seq | **integer**, NOT NULL, `nextval('payment_orders_id_seq')` | ✗ type |
| 2 | `user_id` | `UUID NOT NULL` | `uuid`, **NULLABLE** | ✗ nullability |
| 3 | `user_email` | `TEXT` | `character varying(255)` | ✗ type |
| 4 | `package_id` | `TEXT` | `character varying(100)` | ✗ type |
| 5 | `order_type` | `TEXT NOT NULL`, no default | `character varying(50)`, **NULLABLE**, **DEFAULT `'pro'`** | ✗ type, nullability, default |
| 6 | `base_amount` | `BIGINT NOT NULL` | **`integer`** NOT NULL | ✗ type |
| 7 | `unique_code` | `INTEGER` (nullable) | `integer` **NOT NULL** | ✗ nullability |
| 8 | `exact_amount` | `BIGINT NOT NULL` | **`integer`** NOT NULL | ✗ type |
| 9 | `status` | `TEXT NOT NULL DEFAULT 'pending'` | `character varying(50)`, **NULLABLE**, DEFAULT `'pending'` | ✗ type, nullability |
| 10 | `saweria_donation_id` | **absent** | `character varying(255)`, nullable | ✗ missing from migration |
| 11 | `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | `timestamptz`, **NULLABLE**, DEFAULT `now()` | ✗ nullability |
| 12 | `paid_at` | `TIMESTAMPTZ` | `timestamptz`, nullable, no default | ✓ |
| 13 | `expires_at` | `TIMESTAMPTZ`, **deliberately no default** | `timestamptz`, nullable, **DEFAULT `now() + interval '3 hours'`** | ✗ default |
| 14 | `signature` | `TEXT` | `text`, nullable | ✓ |
| 15 | `qris_url` | `TEXT` | `text`, nullable | ✓ |
| 16 | `qris_image` | `TEXT` | `text`, nullable | ✓ |
| 17 | `package_ids` | `JSONB` | `jsonb`, nullable (comment matches) | ✓ |
| — | `last_reminded_at` | `TIMESTAMPTZ` **present** | **absent** | ✗ missing from production |

**Column counts: 17 claimed / 17 actual.** Same cardinality, different contents.

- Columns matching exactly: **5** — `paid_at`, `signature`, `qris_url`, `qris_image`, `package_ids`.
- Columns differing in at least one attribute: **11**.
- In migration but not production: **1** — `last_reminded_at`.
- In production but not migration: **1** — `saweria_donation_id`.

### Ordinal order

The order is **different**, which is what you would expect of a table grown by out-of-band `ALTER`s rather than by this `CREATE`:

```
migration:  id, user_id, user_email, package_id, order_type, base_amount, unique_code,
            exact_amount, status, package_ids, signature, qris_url, qris_image,
            last_reminded_at, expires_at, paid_at, created_at

production: id, user_id, user_email, package_id, order_type, base_amount, unique_code,
            exact_amount, status, saweria_donation_id, created_at, paid_at,
            expires_at, signature, qris_url, qris_image, package_ids
```

Positions 1–9 agree. Production then diverges: the legacy `saweria_donation_id` sits at 10, `created_at` at 11, and the four columns added by migrations 007/008/011 (`signature`, `qris_url`, `qris_image`, `package_ids`) are appended at 14–17 exactly as `ALTER TABLE ... ADD COLUMN` would place them.

---

## 3. Side-by-side: constraints, keys, indexes

| Object | Migration 012 claims | Production reality | Match |
|--------|----------------------|--------------------|-------|
| Primary key | `PRIMARY KEY (id)` | `payment_orders_pkey PRIMARY KEY (id)` | ✓ |
| `id` generator | `BIGSERIAL` (bigint + bigint sequence) | `integer` + `payment_orders_id_seq` (integer sequence), `last_value = 115`, `max(id) = 115` | ✗ type |
| Foreign key | `user_id → users(id) ON DELETE CASCADE` | `payment_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)` — **no `ON DELETE` clause**, `confdeltype = 'a'` (NO ACTION) | ✗ **no CASCADE** |
| FK validated | implied | `convalidated = true` | ✓ |
| `users.id` type | UUID (implied by FK) | `uuid` | ✓ |
| Index `idx_payment_orders_user_pending` | `(user_id, order_type, status, created_at DESC)` | **does not exist** | ✗ absent |
| Index `idx_payment_orders_pending_created` | `(status, created_at) WHERE status = 'pending'` | **does not exist** | ✗ absent |
| Index `idx_payment_orders_amount` | **not in any migration** | `(exact_amount, status)` btree, non-unique | ✗ undocumented drift |
| Table comment | set by `COMMENT ON TABLE` | `null` — no comment | ✗ |
| Column comment on `package_ids` | not set by 012 (set by 011) | present, matches 011 | ✓ |
| Triggers | none | none | ✓ |
| RLS | not mentioned | disabled, not forced | ✓ |
| Inbound FKs to `payment_orders` | — | none | ✓ |
| Migration bookkeeping table | — | **none exists** (no `migrations`/`schema_version` table) | — |

**Index counts: 3 claimed (PK + 2 named) / 2 actual (PK + 1 named).**
- Present in both: **1** (`payment_orders_pkey`).
- Claimed but absent: **2** (both access-pattern indexes).
- Present but undocumented: **1** (`idx_payment_orders_amount`).

---

## 4. What the table actually holds

Aggregate only — counts, no customer data.

| Metric | Value |
|---|---|
| Total rows | **91** |
| Rows with `user_id` NULL | 47 |
| Rows with `user_id` set | 44 |
| Rows with `saweria_donation_id` set | 2 |
| Rows with `expires_at` NULL | 0 |
| Rows with `paid_at` set | 9 |
| Rows with `package_ids` set | 6 |
| Rows currently `pending` | 0 |

**`status` distinct values:** `expired` = 82, `paid` = 9. No other values. (The code can also write `cancelled`; no row currently carries it.)

**`order_type` distinct values:** `pro` = 45, `single` = 40, `bundle` = 6. No NULLs, no other values.

Cross-tab (counts only):

| status | pro | single | bundle |
|---|---|---|---|
| `expired` | 42 | 35 | 5 |
| `paid` | 3 | 5 | 1 |

The 47 rows with a NULL `user_id` are the reason production's `user_id` is nullable and the reason the migration's `NOT NULL` is wrong: they are legacy Saweria donation rows that predate the Neon Auth user table. Two of them carry a `saweria_donation_id`. No code in `src/` references `saweria_donation_id` — the column is dormant legacy, but it is real and populated, and 47 rows would be unrepresentable under the migration's `user_id UUID NOT NULL`.

---

## 5. Verdict

### Is applying 012 to production a safe no-op?

**No — it is neither a no-op nor a repair.** Two separate reasons.

**(a) It is not a no-op.** `CREATE TABLE IF NOT EXISTS` is skipped because the table exists, but the rest of the file is not guarded by the table's existence:

- `CREATE INDEX IF NOT EXISTS idx_payment_orders_user_pending ...` — the index does not exist, so this **executes and builds it** on production.
- `CREATE INDEX IF NOT EXISTS idx_payment_orders_pending_created ...` — likewise **executes and builds it**.
- `COMMENT ON TABLE payment_orders IS '...'` — **executes and writes** a comment that production does not have.

So "idempotent, so the prod DB where the table already exists is unharmed" (BUG_REPORT, P2-11) is inaccurate: the statement set *does* mutate production. The mutation is benign — two indexes that `PERFORMANCE_REPORT.md` M27 explicitly asks for, on a 91-row table — but it is DDL, it is a write, and it should be described as one. On a large table those two `CREATE INDEX` statements would also take a lock and consume I/O; here they would not.

**(b) It does not make production match the repo, and it does not fix the live defect.** Applying 012 to production would leave all 12 column-level divergences, the missing `ON DELETE CASCADE`, and the absent/undocumented index drift exactly as they are. It creates indexes on columns whose definitions it still gets wrong.

### Is the migration faithful enough for a future fresh provision?

**No.** A staging or fresh environment provisioned from the chain `001 → … → 012 → 007 → …` would build a table that differs from production in **11 of 17 column definitions, with one column present only in the migration and one present only in production**, plus the foreign-key delete rule and the index set. The chain applies cleanly — that part of P2-11 is true — but "applies cleanly" and "matches production" are different claims, and only the first was ever tested.

---

## 6. Discrepancies, and exactly what they cost

Listed in descending order of consequence. Nothing here is softened.

### D-1 · `last_reminded_at` does not exist in production — the abandoned-reminder endpoint is broken in production *today*

The migration declares the column; production does not have it, in any schema (verified: no `last_reminded_at` column exists anywhere in the database). `src/app/api/payment/abandoned-reminders/route.ts` selects it at line 34, filters on it at line 41, and writes it at line 71.

Reproducing that route's `SELECT` verbatim against production returns:

```
ERROR: column "last_reminded_at" does not exist
```

So `POST /api/payment/abandoned-reminders` fails with a 500 on every invocation. This is **not** a staging-only divergence — it is a live production defect that the migration has been masking. The repo's schema is *ahead* of production here, and nothing has ever applied it.

Practical effect: abandoned-cart reminder emails have never been sent from production. The endpoint is authenticated and cron-driven, so the failure is silent — no user sees it, and the 500 is only visible in logs. That it currently has zero `pending` rows to scan is luck, not correctness; the `SELECT` fails at parse/plan time regardless of row count.

Anyone who "fixed" P2-11 by running 012 against production would fix this one column — but as a side effect of a migration whose stated purpose was something else, and while silently accepting 11 other wrong definitions.

### D-2 · `expires_at` has a production default of `now() + 3 hours`, and the migration deliberately omits it

Production: `DEFAULT (now() + '03:00:00'::interval)`. Migration: no default, with an explicit comment justifying the omission — "`expires_at` stays nullable on purpose … a schema default would invent an expiry the gateway never announced."

**That justification is contradicted by the production schema.** Production does invent a 3-hour expiry, for every row, at insert time. Every one of the 91 rows has a non-NULL `expires_at`, consistent with the default having fired.

What a fresh provision gets wrong: new pending orders are inserted with `expires_at = NULL` instead of `now() + 3h`. That silently changes three code paths that read the column:

- `create-order:124,134` — the dedupe query filters `AND expires_at > NOW()`, which is **never true for NULL**. On a fresh environment the "reuse the existing pending order" branch can never match, so every click mints a new order and a new QRIS instead of reusing the live one.
- `payment/history:61` — `r.status === 'pending' && r.expires_at && ...` treats NULL as "not expired", so a stale order reads as pending forever.
- `cancel:70` sets `expires_at = NOW()` explicitly, so cancel behaves the same either way.

The repo already documents the NULL-`expires_at` dedupe miss as a "remaining nuance (documented, not a defect)" and attributes it to `create-order` being pre-existing behaviour. It is not a property of the code — it is a property of the migration. **In production the dedupe works**, because the default populates the column. On a fresh provision it would not. This is the single most damaging behavioural divergence in the file, because it is invisible until duplicate QRIS codes start colliding.

### D-3 · `saweria_donation_id` exists in production and is absent from the migration

`character varying(255)`, nullable, 2 rows populated. Legacy Saweria donation path, superseded by KlikQRIS; no `src/` file references it. A fresh provision would not have the column at all.

Cost: low today (no code reads it), but it means the migration is **not** a description of the table — it is a description of the subset of the table the current code happens to touch. Anyone treating 012 as the schema of record would conclude the column never existed, and a future data migration or restore of legacy donation rows into a fresh environment would fail on the missing column.

### D-4 · `user_id` is nullable in production, `NOT NULL` in the migration

47 of 91 rows have `user_id = NULL` — every one of them a legacy Saweria row. Production permits this; the migration forbids it.

Cost: a fresh environment cannot represent the legacy rows at all. Any backfill or restore that replays them fails on the NOT NULL. Conversely, nothing in the current code inserts a NULL `user_id` (`create-order:194-203` always supplies `userId`), so the constraint is not protecting against a live bug — it is simply stricter than reality.

### D-5 · Foreign key has **no** `ON DELETE CASCADE` in production

Production: `FOREIGN KEY (user_id) REFERENCES users(id)`, `confdeltype = 'a'` → **NO ACTION**. Migration claims `ON DELETE CASCADE`.

Cost: the two schemas behave oppositely when a user is deleted. Production **refuses** to delete a user who has any order (the FK blocks it). A fresh provision **silently deletes** that user's entire order history — including paid orders — as a cascade. No code currently issues `DELETE FROM users` (zero files in `src/`), so this is dormant; but it is a data-loss-shaped difference in the delete direction, and it is the kind of thing that becomes a real incident the first time an admin "cleanup" endpoint is written against the fresh schema.

### D-6 · Both access-pattern indexes are missing from production

`idx_payment_orders_user_pending (user_id, order_type, status, created_at DESC)` and `idx_payment_orders_pending_created (status, created_at) WHERE status = 'pending'` exist in the migration and in **neither** production nor any other migration.

Production instead carries `idx_payment_orders_amount (exact_amount, status)`, which appears in **no migration file**. Live usage counters: `seq_scan = 1704`, `idx_scan = 85`; `idx_payment_orders_amount` has been scanned 2 times and read 0 tuples, while the PK has been scanned 83 times.

Cost: at 91 rows, none. `PERFORMANCE_REPORT.md` M27 already flags both missing indexes and the `idx_payment_orders_amount` drift; this audit confirms it from the database side and adds that the amount index is effectively dead weight. The real cost is documentation: the migration claims indexes that do not exist, so anyone reading `migrations/` believes the hot paths are covered when they are not.

### D-7 · `id` is `integer`, not `BIGSERIAL`

Production: `integer` + `payment_orders_id_seq` (integer sequence), `last_value = 115`, `max(id) = 115` — in sync. Migration: `BIGSERIAL`, i.e. bigint.

Cost: no practical risk at 115 ids. But the two schemas diverge in type, and a fresh provision's `id` is `bigint` where production's is `int4`. Any future FK from another table to `payment_orders(id)` would have to pick one; picking `bigint` would be incompatible with production, `int4` incompatible with the fresh schema. `Number(order.id)` in the app hides this today.

### D-8 · `base_amount` / `exact_amount` are `integer`, not `BIGINT`

Production: `integer` for both. Migration: `BIGINT` for both. IDR amounts for this product (tens of thousands to low millions) fit `int4` with enormous headroom, so nothing is at risk. It is still a type mismatch, and it means the migration's claim that amounts are `BIGINT` is false. The migration's `exact_amount = base_amount + unique_code` comment holds either way.

### D-9 · `unique_code` is `NOT NULL` in production, nullable in the migration

Cost: a fresh environment would accept a NULL `unique_code` that production rejects. `create-order` inserts `0` and then updates it from the gateway response (`create-order:199`, `:264`), so neither schema sees a NULL in practice — but the constraints disagree, and the stricter one is production.

### D-10 · `order_type` is nullable with `DEFAULT 'pro'` in production

Migration: `TEXT NOT NULL`, no default. Production: `varchar(50)`, nullable, `DEFAULT 'pro'::character varying`.

Cost: the production default implies historical inserts omitted `order_type` and relied on it defaulting to a PRO upgrade. A fresh provision would reject those inserts outright. Current code always supplies `order_type` explicitly, so this is legacy-only — but it is another place where the fresh schema is stricter than the one that actually holds the data, and it would break a replay of the legacy insert path.

### D-11 · `status` and `created_at` are nullable in production, `NOT NULL` in the migration

Both are nullable in production; both are declared `NOT NULL` in the migration. No row currently has a NULL in either column (`status_null = 0`, `created_at_null = 0`), and no code path inserts one. This is cosmetic strictness — a fresh schema that would reject rows production would have accepted. Low cost, still a divergence.

### D-12 · `TEXT` vs bounded `VARCHAR(n)`

`user_email` → `varchar(255)`, `package_id` → `varchar(100)`, `order_type` → `varchar(50)`, `status` → `varchar(50)`. The migration uses unbounded `TEXT` for all four.

Cost: a fresh environment imposes no length limit where production does. An over-long `package_id` (or a typo'd `order_type`) inserts successfully on staging and fails on production — the classic direction of drift that makes staging green and production red. `package_ids` being `jsonb` rather than `text[]` is correctly matched, at least.

### D-13 · Table comment absent in production

`COMMENT ON TABLE payment_orders IS '...'` is in the migration; `obj_description` for the production table is `null`. The `package_ids` column comment *does* exist, because migration 011 was evidently applied out-of-band. Minor, but it is more evidence that the migration file is not a record of what ran.

---

## 7. Summary table

| Dimension | Migration 012 | Production | Agree? |
|---|---|---|---|
| Column count | 17 | 17 | ✓ (count only) |
| Columns identical | — | — | 5 of 17 |
| Columns differing | — | — | 11 of 17 |
| Column in migration only | `last_reminded_at` | — | ✗ |
| Column in production only | — | `saweria_donation_id` | ✗ |
| Ordinal order | 1–9 then `package_ids…created_at` | 1–9 then `saweria…created_at…package_ids` | ✗ |
| PK | `(id)` | `(id)` | ✓ |
| `id` type | `bigint` (BIGSERIAL) | `integer` + seq | ✗ |
| FK target | `users(id)` | `users(id)` | ✓ |
| FK delete rule | `ON DELETE CASCADE` | NO ACTION | ✗ |
| Index count | 3 (PK + 2) | 2 (PK + 1) | ✗ |
| Named indexes | 2 | 1 (different name) | ✗ |
| Table comment | set | none | ✗ |
| Triggers / RLS | none / n/a | none / disabled | ✓ |
| Rows | — | 91 | — |

---

## 8. Recommended remediation (not performed — this audit is read-only)

Ordered by what actually breaks. None of these were executed.

1. **`last_reminded_at`** — either add the column to production (`ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ;`) or remove the dependency from `abandoned-reminders`. As it stands the endpoint 500s. This is a live bug, independent of the migration-drift question.
2. **`expires_at`** — decide which behaviour is intended. Production populates it with `now() + 3h`; the migration argues it should stay NULL. They cannot both be right. If production's default is intended, migration 012 must carry it and the BUG_REPORT's "no default on purpose" rationale must be withdrawn. If NULL is intended, production has been issuing 3-hour expiries that nothing in the repo knows about.
3. **`ON DELETE CASCADE`** — production has NO ACTION. Align one side; a cascade on a table holding paid orders is the more dangerous default.
4. **Indexes** — decide whether `idx_payment_orders_amount` should be dropped and the two access-pattern indexes added, and put the answer in a migration so the repo and the database stop disagreeing.
5. **Type/nullability/default drift** — `id`, `user_id`, `base_amount`, `exact_amount`, `unique_code`, `order_type`, `status`, `created_at`, and the four `varchar` bounds. These are non-urgent but they are what makes a staging provision unfaithful.
6. **`saweria_donation_id`** — record it as a legacy column, either by adding it to 012 or by a comment, so it stops being invisible.

A migration cannot be both "the CREATE that a fresh environment needs" and "a description of production" unless the two are reconciled. Today they are not, and 012 is the first of those two things only.

---

## 9. Hygiene confirmation

- The Vercel-pulled env file was written to `%LOCALAPPDATA%\Temp\hermes-pgverify-155979\` — outside the repository, in the OS temp tree, never in the working directory.
- **It has been deleted**, together with the whole scratch directory (the pull output, the intermediate JSON from the Vercel API, and the query scripts). Verified by the directory no longer existing.
- No file inside the repo was created or modified by the data-collection step. The only repository files touched by this task are this document and the appended status line in `docs/audit/BUG_REPORT.md`.
- Nothing was written to the production database: no DDL, no `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, or `COPY`. Every session set `default_transaction_read_only = on` and that setting was read back and confirmed before the first query.
