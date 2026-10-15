import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { decodeProtectedHeader, decodeJwt, SignJWT } from 'jose';
import { hashPassword, verifyPassword, createToken, verifyToken } from '@/lib/auth';
import {
  scopedKey,
  getScopedJSON,
  setScopedJSON,
  removeScopedKey,
  clearGuestTrialFlags,
  clearAllGuestData,
  GUEST_TRIAL_KEYS,
} from '@/lib/userStorage';

// ── Mock DB and RateLimit for Route Tests ──
const mockFindUserByEmail = vi.fn();
const mockCreateUser = vi.fn();
const mockSql = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => mockSql,
  findUserByEmail: (...args: any[]) => mockFindUserByEmail(...args),
  createUser: (...args: any[]) => mockCreateUser(...args),
  isDbConnected: vi.fn(async () => true),
}));

const mockCheckRateLimit = vi.fn();
const mockGetClientIp = vi.fn(() => '192.168.1.100');

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: (...args: any[]) => mockCheckRateLimit(...args),
  getClientIp: (...args: any[]) => mockGetClientIp(...args),
}));

describe('Agent 1 QA Audit: Authentication, Session Lifecycle & Storage Hygiene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 9,
      retryAfterSeconds: 0,
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Password Hashing and Bcrypt Salt Rounds
  // ─────────────────────────────────────────────────────────────
  describe('1. Password Hashing & Bcrypt Security', () => {
    it('uses bcrypt with standard 10 salt rounds and appropriate version identifier', async () => {
      const plaintext = 'SuperSecretP@ssw0rd2026';
      const hash = await hashPassword(plaintext);

      expect(typeof hash).toBe('string');
      // Bcrypt hash regex: $2a$ or $2b$ with 2 digits of cost factor (10)
      expect(hash).toMatch(/^\$2[ab]\$10\$.{53}$/);

      // Verify exact rounds via bcrypt helper
      const rounds = bcrypt.getRounds(hash);
      expect(rounds).toBe(10);
    });

    it('verifies valid password matching hash successfully', async () => {
      const password = 'IndonesianCPNS2026!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('rejects invalid password against valid hash', async () => {
      const password = 'CorrectPassword123';
      const hash = await hashPassword(password);

      const isInvalid = await verifyPassword('IncorrectPassword123', hash);
      expect(isInvalid).toBe(false);
    });

    it('generates different salts and distinct hashes for identical plaintexts', async () => {
      const password = 'IdenticalPasswordCheck';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });

    it('fails safely when comparing against invalid or malformed hash', async () => {
      const isMatch = await verifyPassword('password', 'not-a-valid-bcrypt-hash');
      expect(isMatch).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. JWT Signing, Expiration (7 days), and HS256 Jose Validation
  // ─────────────────────────────────────────────────────────────
  describe('2. JWT Token Lifecycle & Jose HS256 Validation', () => {
    it('signs token with HS256 algorithm in protected header', async () => {
      const payload = { email: 'auditor@lolosin.com', userId: 'usr-agent-001' };
      const token = await createToken(payload);

      expect(typeof token).toBe('string');
      const parts = token.split('.');
      expect(parts.length).toBe(3);

      const header = decodeProtectedHeader(token);
      expect(header.alg).toBe('HS256');
    });

    it('enforces exact 7-day (604,800 seconds) expiration window', async () => {
      const payload = { email: 'pejuang@lolosin.com', userId: 'usr-nip-999' };
      const token = await createToken(payload);

      const claims = decodeJwt(token);
      expect(claims.exp).toBeDefined();
      expect(claims.iat).toBeDefined();

      const durationSeconds = (claims.exp as number) - (claims.iat as number);
      const expectedSevenDaysInSeconds = 7 * 24 * 60 * 60; // 604,800 seconds
      expect(durationSeconds).toBe(expectedSevenDaysInSeconds);
    });

    it('verifies valid token and reconstructs auth payload', async () => {
      const payload = { email: 'budi.santoso@cpns.go.id', userId: 'user-budi-77' };
      const token = await createToken(payload);

      const verified = await verifyToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.email).toBe('budi.santoso@cpns.go.id');
      expect(verified?.userId).toBe('user-budi-77');
    });

    it('rejects tampered or corrupt token payloads', async () => {
      const token = await createToken({ email: 'user@test.com', userId: 'u1' });
      const parts = token.split('.');
      // Tamper signature part
      const tampered = `${parts[0]}.${parts[1]}.badSignatureHere`;

      const verified = await verifyToken(tampered);
      expect(verified).toBeNull();
    });

    it('rejects expired JWT token', async () => {
      // Craft an expired token with past expiration
      const secret = new TextEncoder().encode('lolos-in-dev-only-secret-not-for-production-key-2026');
      const expiredToken = await new SignJWT({ email: 'expired@test.com', userId: 'u-exp' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 1000)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
        .sign(secret);

      const verified = await verifyToken(expiredToken);
      expect(verified).toBeNull();
    });

    it('rejects token signed with an invalid/different secret', async () => {
      const foreignSecret = new TextEncoder().encode('unauthorized-foreign-key-for-attack');
      const rogueToken = await new SignJWT({ email: 'attacker@evil.com', userId: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(foreignSecret);

      const verified = await verifyToken(rogueToken);
      expect(verified).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Login Route: Invalid Credentials & Malformed Inputs
  // ─────────────────────────────────────────────────────────────
  describe('3. Login API Route (/api/auth/login)', () => {
    it('returns 400 when email or password is missing or empty', async () => {
      const { POST } = await import('@/app/api/auth/login/route');

      // Missing password
      const req1 = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      const res1 = await POST(req1);
      expect(res1.status).toBe(400);
      const json1 = await res1.json();
      expect(json1.error).toContain('wajib diisi');

      // Empty email
      const req2 = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '', password: 'somepassword' }),
      });
      const res2 = await POST(req2);
      expect(res2.status).toBe(400);
    });

    it('returns 401 with generic error when user does not exist (anti-enumeration)', async () => {
      mockFindUserByEmail.mockResolvedValueOnce(null);

      const { POST } = await import('@/app/api/auth/login/route');
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@example.com', password: 'password123' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Email atau password salah.');
    });

    it('returns 401 with generic error when password does not match', async () => {
      const realHash = await hashPassword('correct_pass_123');
      mockFindUserByEmail.mockResolvedValueOnce({
        id: 'usr-1',
        email: 'user1@example.com',
        name: 'User One',
        password_hash: realHash,
      });

      const { POST } = await import('@/app/api/auth/login/route');
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user1@example.com', password: 'wrong_password' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Email atau password salah.');
    });

    it('returns 200 and sets httpOnly 7-day cpns_token cookie on successful login', async () => {
      const realPassword = 'validPassword2026';
      const realHash = await hashPassword(realPassword);
      mockFindUserByEmail.mockResolvedValueOnce({
        id: 'usr-success-123',
        email: 'peserta@lolosin.com',
        name: 'Peserta Sukses',
        password_hash: realHash,
      });

      const { POST } = await import('@/app/api/auth/login/route');
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'peserta@lolosin.com', password: realPassword }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.id).toBe('usr-success-123');
      expect(json.user.email).toBe('peserta@lolosin.com');

      // Verify Set-Cookie header contains cpns_token with security attributes
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).not.toBeNull();
      expect(setCookie).toContain('cpns_token=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('Max-Age=604800'); // 7 days
      expect(setCookie).toMatch(/samesite=lax/i);
    });

    it('enforces rate limiting on login attempts and responds with 429', async () => {
      mockCheckRateLimit.mockResolvedValueOnce({
        success: false,
        remaining: 0,
        retryAfterSeconds: 45,
      });

      const { POST } = await import('@/app/api/auth/login/route');
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'target@example.com', password: 'pass' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBe('45');
      const json = await res.json();
      expect(json.error).toContain('Terlalu banyak percobaan');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. OTP Verification Route: Valid, Expired, Incorrect Codes
  // ─────────────────────────────────────────────────────────────
  describe('4. OTP Verification Route (/api/auth/verify-otp)', () => {
    it('returns 400 when email or OTP is omitted', async () => {
      const { POST } = await import('@/app/api/auth/verify-otp/route');

      const req = new Request('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }), // missing otp
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('wajib diisi');
    });

    it('returns 400 when OTP code is incorrect or expired (no active DB record)', async () => {
      // Mock DB SELECT returning 0 rows (expired or mismatched OTP)
      mockSql.mockResolvedValueOnce([]);

      const { POST } = await import('@/app/api/auth/verify-otp/route');
      const req = new Request('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com', otp: '999999' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Kode OTP salah atau sudah kedaluwarsa.');
    });

    it('verifies valid OTP, provisions user, purges OTP and sets 7-day cookie', async () => {
      const testEmail = 'baru@cpns.go.id';
      const testOtp = '123456';
      const tempHash = await hashPassword('passwordBaru123');

      // 1. SELECT returns matching pending OTP record
      mockSql.mockResolvedValueOnce([
        {
          id: 1,
          email: testEmail,
          otp: testOtp,
          temp_password_hash: tempHash,
          temp_name: 'Calon PNS Juara',
          expires_at: new Date(Date.now() + 500000).toISOString(),
        },
      ]);

      // 2. Mock createUser
      mockCreateUser.mockResolvedValueOnce({
        id: 'usr-new-registered-001',
        email: testEmail,
        name: 'Calon PNS Juara',
      });

      // 3. Mock DELETE FROM email_otps
      mockSql.mockResolvedValueOnce([]);

      const { POST } = await import('@/app/api/auth/verify-otp/route');
      const req = new Request('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, otp: testOtp }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.email).toBe(testEmail);
      expect(json.user.id).toBe('usr-new-registered-001');

      // Verify cookie set
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toContain('cpns_token=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('Max-Age=604800');
    });

    it('enforces rate limiting on OTP submissions', async () => {
      mockCheckRateLimit.mockResolvedValueOnce({
        success: false,
        remaining: 0,
        retryAfterSeconds: 120,
      });

      const { POST } = await import('@/app/api/auth/verify-otp/route');
      const req = new Request('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'otp-limit@example.com', otp: '123456' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBe('120');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Multi-Tenant Storage Key Isolation (scopedKey)
  // ─────────────────────────────────────────────────────────────
  describe('5. Multi-Tenant Storage Key Isolation (scopedKey)', () => {
    it('isolates guest storage keys under lolos_guest_ prefix', () => {
      expect(scopedKey('drill_stats')).toBe('lolos_guest_drill_stats');
      expect(scopedKey('roadmap', null)).toBe('lolos_guest_roadmap');
      expect(scopedKey('flashcard_mastery', undefined)).toBe('lolos_guest_flashcard_mastery');
    });

    it('isolates authenticated user storage keys under lolos_u_<userId>_ prefix', () => {
      const userAKey = scopedKey('drill_stats', 'user_A');
      const userBKey = scopedKey('drill_stats', 'user_B');

      expect(userAKey).toBe('lolos_u_user_A_drill_stats');
      expect(userBKey).toBe('lolos_u_user_B_drill_stats');
      expect(userAKey).not.toBe(userBKey);
    });

    it('prevents cross-tenant state bleed with getScopedJSON & setScopedJSON', () => {
      // Mock browser window and localStorage in node environment
      const memoryStorage: Record<string, string> = {};
      const fakeLocalStorage = {
        getItem: (k: string) => memoryStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          memoryStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete memoryStorage[k];
        },
        clear: () => {
          Object.keys(memoryStorage).forEach((k) => delete memoryStorage[k]);
        },
        key: (i: number) => Object.keys(memoryStorage)[i] ?? null,
        get length() {
          return Object.keys(memoryStorage).length;
        },
      };

      (global as any).window = {};
      (global as any).localStorage = fakeLocalStorage;

      // Set guest progress
      setScopedJSON('roadmap', null, { completed: [1, 2] });
      // Set User A progress
      setScopedJSON('roadmap', 'user-AAA', { completed: [1, 2, 3, 4] });
      // Set User B progress
      setScopedJSON('roadmap', 'user-BBB', { completed: [99] });

      // Verify each tenant retrieves only their isolated progress
      const guestProgress = getScopedJSON('roadmap', null, { completed: [] });
      const userAProgress = getScopedJSON('roadmap', 'user-AAA', { completed: [] });
      const userBProgress = getScopedJSON('roadmap', 'user-BBB', { completed: [] });

      expect(guestProgress).toEqual({ completed: [1, 2] });
      expect(userAProgress).toEqual({ completed: [1, 2, 3, 4] });
      expect(userBProgress).toEqual({ completed: [99] });

      // Removing User A key does not touch guest or User B
      removeScopedKey('roadmap', 'user-AAA');
      expect(getScopedJSON('roadmap', 'user-AAA', null)).toBeNull();
      expect(getScopedJSON('roadmap', null, null)).not.toBeNull();
      expect(getScopedJSON('roadmap', 'user-BBB', null)).not.toBeNull();

      // Corrupted JSON fallback safety check
      memoryStorage['lolos_u_corrupt_data'] = '{bad-json-syntax...';
      const fallbackResult = getScopedJSON('data', 'corrupt', { safe: true });
      expect(fallbackResult).toEqual({ safe: true });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. LocalStorage Cleanup of Guest Trial Flags on Login
  // ─────────────────────────────────────────────────────────────
  describe('6. LocalStorage Cleanup of Guest Trial Flags', () => {
    it('defines and tracks all guest trial limit keys', () => {
      expect(GUEST_TRIAL_KEYS).toContain('lolos_guest_tried_drill');
      expect(GUEST_TRIAL_KEYS).toContain('lolos_guest_tried_flashcard');
      expect(GUEST_TRIAL_KEYS).toContain('lolos_guest_tried_journey');
      expect(GUEST_TRIAL_KEYS).toContain('lolos_guest_tried_psikotes');
    });

    it('clearGuestTrialFlags cleanly purges trial locks while preserving user-scoped state', () => {
      const memoryStorage: Record<string, string> = {
        lolos_guest_tried_drill: 'true',
        lolos_guest_tried_flashcard: 'true',
        lolos_guest_tried_journey: 'true',
        lolos_guest_tried_psikotes: 'true',
        lolos_u_user123_drill_history: JSON.stringify({ score: 100 }),
        lolos_u_user123_roadmap: JSON.stringify({ day: 5 }),
      };

      const fakeLocalStorage = {
        getItem: (k: string) => memoryStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          memoryStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete memoryStorage[k];
        },
        clear: () => {
          Object.keys(memoryStorage).forEach((k) => delete memoryStorage[k]);
        },
        key: (i: number) => Object.keys(memoryStorage)[i] ?? null,
        get length() {
          return Object.keys(memoryStorage).length;
        },
      };

      (global as any).window = {};
      (global as any).localStorage = fakeLocalStorage;

      // Execute cleanup helper
      clearGuestTrialFlags();

      // Ensure all guest trial locks are removed
      expect(fakeLocalStorage.getItem('lolos_guest_tried_drill')).toBeNull();
      expect(fakeLocalStorage.getItem('lolos_guest_tried_flashcard')).toBeNull();
      expect(fakeLocalStorage.getItem('lolos_guest_tried_journey')).toBeNull();
      expect(fakeLocalStorage.getItem('lolos_guest_tried_psikotes')).toBeNull();

      // Ensure authenticated user data is strictly preserved
      expect(fakeLocalStorage.getItem('lolos_u_user123_drill_history')).not.toBeNull();
      expect(fakeLocalStorage.getItem('lolos_u_user123_roadmap')).not.toBeNull();
    });

    it('clearAllGuestData purges all lolos_guest_* keys and leaves user data untouched', () => {
      const memoryStorage: Record<string, string> = {
        lolos_guest_tried_drill: 'true',
        lolos_guest_roadmap: JSON.stringify({ completed: [1] }),
        lolos_guest_exam_tryout1: JSON.stringify({ score: 400 }),
        lolos_u_user999_exam_tryout1: JSON.stringify({ score: 450 }),
      };

      const fakeLocalStorage = {
        getItem: (k: string) => memoryStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          memoryStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete memoryStorage[k];
        },
        key: (i: number) => Object.keys(memoryStorage)[i] ?? null,
        get length() {
          return Object.keys(memoryStorage).length;
        },
      };

      (global as any).window = {};
      (global as any).localStorage = fakeLocalStorage;

      clearAllGuestData();

      expect(fakeLocalStorage.getItem('lolos_guest_tried_drill')).toBeNull();
      expect(fakeLocalStorage.getItem('lolos_guest_roadmap')).toBeNull();
      expect(fakeLocalStorage.getItem('lolos_guest_exam_tryout1')).toBeNull();
      expect(fakeLocalStorage.getItem('lolos_u_user999_exam_tryout1')).not.toBeNull();
    });
  });
});
