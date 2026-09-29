import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET env var is required in production');
  }
  // ponytail: fallback only safe for dev; set JWT_SECRET in prod
  return new TextEncoder().encode(secret || 'dev-only-cpns-secret-do-not-use-in-prod');
}

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
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      phone: payload.phone as string,
      userId: payload.userId as string,
    };
  } catch {
    return null;
  }
}
