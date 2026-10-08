import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'Email, OTP, dan password baru wajib diisi.' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password baru minimal 6 karakter.' }, { status: 400 });
    }

    const sql = getDb();
    if (!sql) throw new Error('Database not configured');

    const normalizedEmail = email.trim().toLowerCase();

    // Cari OTP yang valid
    const rows = await sql`
      SELECT otp, expires_at FROM password_resets
      WHERE email = ${normalizedEmail}
      ORDER BY created_at DESC LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Kode OTP tidak ditemukan. Minta ulang kode baru.' }, { status: 400 });
    }

    const record = rows[0];
    if (new Date(record.expires_at) < new Date()) {
      await sql`DELETE FROM password_resets WHERE email = ${normalizedEmail}`;
      return NextResponse.json({ error: 'Kode OTP sudah kedaluwarsa. Minta ulang kode baru.' }, { status: 400 });
    }

    if (record.otp !== otp.trim()) {
      return NextResponse.json({ error: 'Kode OTP salah.' }, { status: 400 });
    }

    // Update password user
    const passwordHash = await hashPassword(newPassword);
    const updated = await sql`
      UPDATE users SET password_hash = ${passwordHash}
      WHERE LOWER(email) = ${normalizedEmail}
      RETURNING id
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 404 });
    }

    // Hapus OTP setelah berhasil digunakan
    await sql`DELETE FROM password_resets WHERE email = ${normalizedEmail}`;

    return NextResponse.json({ success: true, message: 'Password berhasil diubah. Silakan login.' });
  } catch (err: unknown) {
    console.error('[reset-password]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
