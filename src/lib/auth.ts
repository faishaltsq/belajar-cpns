import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Jika JWT_SECRET belum diset di hosting, turunkan secret unik dari hash DATABASE_URL
    // agar token tetap aman, tidak crash, dan tidak menggunakan default string publik
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const derived = crypto.createHash('sha256').update(dbUrl + '-lolos-in-salt-2026').digest();
      return new Uint8Array(derived);
    }
    return new TextEncoder().encode('lolos-in-dev-only-secret-not-for-production-key-2026');
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface AuthPayload {
  email: string;
  userId: string;
}

export async function createToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      email: payload.email as string,
      userId: payload.userId as string,
    };
  } catch {
    return null;
  }
}
