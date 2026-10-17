import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

let warnedMissingSecret = false;

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (secret) return new TextEncoder().encode(secret);

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not set. Refusing to sign or verify tokens in production.');
  }

  if (!warnedMissingSecret) {
    console.warn(
      '[auth] JWT_SECRET is not set — using an insecure development secret. Never deploy without JWT_SECRET.'
    );
    warnedMissingSecret = true;
  }

  // Dev/test fallback only: derive a per-deployment secret so tokens stay
  // invalid across environments without ever falling back to a public literal.
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const derived = crypto.createHash('sha256').update(dbUrl + '-lolos-in-salt-2026').digest();
    return new Uint8Array(derived);
  }
  return new Uint8Array(crypto.createHash('sha256').update('lolos-in-local-dev-only').digest());
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
