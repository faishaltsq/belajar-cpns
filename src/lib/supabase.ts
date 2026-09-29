import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Service role client (server-side only)
function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url === 'your-project-url') return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const supabaseAdmin = createAdminClient();

// In-memory fallback for local dev when Supabase not configured
const localUsers = new Map<string, { id: string; phone: string; pinHash: string; name: string; created_at: string }>();

export type DbUser = {
  id: string;
  phone: string;
  pin_hash: string;
  name: string;
  created_at: string;
};

// User helpers (use Supabase if available, fallback to in-memory)
export async function findUserByPhone(phone: string): Promise<DbUser | null> {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();
    if (error || !data) return null;
    return data as DbUser;
  }
  const u = localUsers.get(phone);
  if (!u) return null;
  return { id: u.id, phone: u.phone, pin_hash: u.pinHash, name: u.name, created_at: u.created_at };
}

export async function createUser(phone: string, pinHash: string, name: string): Promise<DbUser> {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({ phone, pin_hash: pinHash, name })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as DbUser;
  }
  const user = { id, phone, pinHash, name, created_at };
  localUsers.set(phone, user);
  return { id, phone, pin_hash: pinHash, name, created_at };
}
