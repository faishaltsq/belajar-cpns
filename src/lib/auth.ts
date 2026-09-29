import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

// ponytail: static fallback secret for dev; set JWT_SECRET env in prod
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'belajar-cpns-super-secret-key-2026-xyz123'
);

export async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export interface AuthPayload {
  phone: string;
  userId: string;
}

export async function createToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      phone: payload.phone as string,
      userId: payload.userId as string,
    };
  } catch {
    return null;
  }
}
