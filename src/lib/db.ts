import { neon, neonConfig } from '@neondatabase/serverless';

// Aktifkan caching connection pool untuk edge/serverless runtime
neonConfig.fetchConnectionCache = true;

/**
 * Returns a Neon SQL query executor if DATABASE_URL is set, otherwise null.
 */
export function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  return neon(url);
}

/**
 * Helper to check if DB is connected
 */
export async function isDbConnected(): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    const result = await sql`SELECT 1 as connected`;
    return Boolean(result && result[0]?.connected === 1);
  } catch {
    return false;
  }
}
