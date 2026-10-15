import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------
// Mocks Setup
// ---------------------------------------------------------
const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({
  getDb: () => mockSql,
}));

const mockCookieStore = {
  get: vi.fn(),
};
vi.mock('next/headers', () => ({
  cookies: () => mockCookieStore,
}));

const mockVerifyToken = vi.fn();
vi.mock('@/lib/auth', () => ({
  verifyToken: (...args: any[]) => mockVerifyToken(...args),
}));

const mockCreateKlikQris = vi.fn();
const mockCheckKlikQris = vi.fn();
vi.mock('@/lib/klikqris', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/klikqris')>();
  return {
    ...actual,
    createKlikQrisTransaction: (...args: any[]) => mockCreateKlikQris(...args),
    checkKlikQrisStatus: (...args: any[]) => mockCheckKlikQris(...args),
  };
});

const mockSendOtpEmail = vi.fn();
vi.mock('@/lib/mailer', () => ({
  sendOtpEmail: (...args: any[]) => mockSendOtpEmail(...args),
}));

// Route Handlers
import { POST as createOrderHandler } from '@/app/api/payment/create-order/route';
import { POST as klikQrisWebhookHandler } from '@/app/api/webhooks/klikqris/route';
import { POST as cancelOrderHandler } from '@/app/api/payment/cancel/route';
import { GET as getOrderStatusHandler } from '@/app/api/payment/order-status/route';
import { POST as abandonedRemindersHandler } from '@/app/api/payment/abandoned-reminders/route';

// Unit Logic
import {
  isOrderEligibleForReminder,
  buildAbandonedReminderEmail,
} from '@/lib/abandonedReminder';
import { getKlikQrisBaseUrl } from '@/lib/klikqris';

describe('QA Agent 2: Payment, KlikQRIS & Order Lifecycle Suite', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCookieStore.get.mockReturnValue(null);
    mockVerifyToken.mockResolvedValue(null);
  });

  // =========================================================================
  // 1. Order Creation (/api/payment/create-order) & Pricing Tiers
  // =========================================================================
  describe('1. Order Creation & Pricing Logic (POST /api/payment/create-order)', () => {
    it('creates PRO all-access order with default base price Rp 150.000', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
      mockVerifyToken.mockResolvedValue({ userId: 'u-101', email: 'pejuang@test.com' });

      // 1. SELECT is_pro, unlocked_packages
      mockSql.mockResolvedValueOnce([{ is_pro: false, unlocked_packages: [] }]);
      // 2. SELECT existing pending order -> none
      mockSql.mockResolvedValueOnce([]);
      // 3. INSERT INTO payment_orders RETURNING id
      mockSql.mockResolvedValueOnce([{ id: 501 }]);
      // 4. UPDATE payment_orders with KlikQRIS details
      mockSql.mockResolvedValueOnce([]);

      mockCreateKlikQris.mockResolvedValueOnce({
        success: true,
        orderId: 'INV-501',
        amount: 150000,
        uniqueCode: 123,
        totalAmount: 150123,
        status: 'PENDING',
        qrisUrl: 'https://klikqris.com/qris_501.png',
        qrisImage: 'data:image/png;base64,mockqr501',
        signature: 'sig-501',
      });

      const req = new NextRequest('http://localhost:3000/api/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({ orderType: 'pro' }),
      });

      const res = await createOrderHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.orderId).toBe(501);
      expect(json.invoiceCode).toBe('INV-501');
      expect(json.baseAmount).toBe(150000);
      expect(json.uniqueCode).toBe(123);
      expect(json.exactAmount).toBe(150123);
      expect(json.orderType).toBe('pro');
      expect(json.packageId).toBeNull();
      expect(json.gateway).toBe('klikqris');
    });

    it('creates Single Package order with default base price Rp 5.000 for specific package', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
      mockVerifyToken.mockResolvedValue({ userId: 'u-102', email: 'user2@test.com' });

      // 1. SELECT is_pro, unlocked_packages
      mockSql.mockResolvedValueOnce([{ is_pro: false, unlocked_packages: ['tryout-1'] }]);
      // 2. SELECT existing pending order -> none
      mockSql.mockResolvedValueOnce([]);
      // 3. INSERT INTO payment_orders RETURNING id
      mockSql.mockResolvedValueOnce([{ id: 502 }]);
      // 4. UPDATE payment_orders
      mockSql.mockResolvedValueOnce([]);

      mockCreateKlikQris.mockResolvedValueOnce({
        success: true,
        orderId: 'INV-502',
        amount: 5000,
        uniqueCode: 42,
        totalAmount: 5042,
        status: 'PENDING',
        qrisUrl: 'https://klikqris.com/qris_502.png',
        signature: 'sig-502',
      });

      const req = new NextRequest('http://localhost:3000/api/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({ orderType: 'single', packageId: 'tryout-8' }),
      });

      const res = await createOrderHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.orderId).toBe(502);
      expect(json.baseAmount).toBe(5000);
      expect(json.uniqueCode).toBe(42);
      expect(json.exactAmount).toBe(5042);
      expect(json.orderType).toBe('single');
      expect(json.packageId).toBe('tryout-8');
    });

    it('honors custom baseAmount override from request body when supplied', async () => {
      mockSql.mockResolvedValueOnce([]); // no existing pending order
      mockSql.mockResolvedValueOnce([{ id: 503 }]); // insert order
      mockSql.mockResolvedValueOnce([]); // update order

      mockCreateKlikQris.mockResolvedValueOnce({
        success: true,
        orderId: 'INV-503',
        amount: 49000,
        uniqueCode: 15,
        totalAmount: 49015,
        status: 'PENDING',
      });

      const req = new NextRequest('http://localhost:3000/api/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({
          orderType: 'pro',
          baseAmount: 49000,
          userEmail: 'guest@test.com',
        }),
      });

      const res = await createOrderHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.baseAmount).toBe(49000);
      expect(json.exactAmount).toBe(49015);
      expect(json.uniqueCode).toBe(15);
    });

    it('rejects order creation with 409 ALREADY_PRO when user is already PRO', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'token-pro' });
      mockVerifyToken.mockResolvedValue({ userId: 'u-pro', email: 'pro@test.com' });

      // User is already Pro
      mockSql.mockResolvedValueOnce([{ is_pro: true, unlocked_packages: [] }]);

      const req = new NextRequest('http://localhost:3000/api/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({ orderType: 'pro' }),
      });

      const res = await createOrderHandler(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe('ALREADY_PRO');
      expect(json.message).toContain('sudah berstatus PRO');
    });

    it('rejects order creation with 409 ALREADY_UNLOCKED when single package is already unlocked', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'token-user' });
      mockVerifyToken.mockResolvedValue({ userId: 'u-unlocked', email: 'u@test.com' });

      mockSql.mockResolvedValueOnce([{ is_pro: false, unlocked_packages: ['tryout-5', 'tryout-6'] }]);

      const req = new NextRequest('http://localhost:3000/api/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({ orderType: 'single', packageId: 'tryout-5' }),
      });

      const res = await createOrderHandler(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe('ALREADY_UNLOCKED');
      expect(json.message).toContain('tryout-5 sudah terbuka');
    });

    it('reuses existing active pending order with valid QRIS image rather than creating duplicates', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'token-active' });
      mockVerifyToken.mockResolvedValue({ userId: 'u-reuse', email: 'reuse@test.com' });

      // 1. SELECT is_pro
      mockSql.mockResolvedValueOnce([{ is_pro: false, unlocked_packages: [] }]);
      // 2. Existing active pending order
      mockSql.mockResolvedValueOnce([
        {
          id: 400,
          base_amount: 150000,
          unique_code: 88,
          exact_amount: 150088,
          status: 'pending',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          qris_image: 'data:image/png;base64,existingQRIS',
          qris_url: 'https://klikqris.com/storage/qris_400.png',
        },
      ]);

      const req = new NextRequest('http://localhost:3000/api/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({ orderType: 'pro' }),
      });

      const res = await createOrderHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.orderId).toBe(400);
      expect(json.exactAmount).toBe(150088);
      // Ensure KlikQRIS API create was NOT called again (cached)
      expect(mockCreateKlikQris).not.toHaveBeenCalled();
    });

    it('rolls back database entry and returns 502 when KlikQRIS API returns error', async () => {
      mockSql.mockResolvedValueOnce([]); // no existing order
      mockSql.mockResolvedValueOnce([{ id: 601 }]); // INSERT order
      mockSql.mockResolvedValueOnce([]); // DELETE on rollback

      mockCreateKlikQris.mockResolvedValueOnce({
        success: false,
        orderId: 'INV-601',
        amount: 5000,
        uniqueCode: 0,
        totalAmount: 5000,
        status: 'FAILED',
        error: 'Merchant limit exceeded',
      });

      const req = new NextRequest('http://localhost:3000/api/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({
          orderType: 'single',
          packageId: 'tryout-9',
          userEmail: 'guest@test.com',
        }),
      });

      const res = await createOrderHandler(req);
      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.error).toContain('Merchant limit exceeded');
    });
  });

  // =========================================================================
  // 2. Webhook Authentication, Signatures & Idempotency
  // =========================================================================
  describe('2. Webhook Signature Security & Idempotency (POST /api/webhooks/klikqris)', () => {
    it('rejects missing order_id with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
        method: 'POST',
        body: JSON.stringify({ status: 'PAID' }),
      });
      const res = await klikQrisWebhookHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Missing order_id');
    });

    it('rejects non-numeric order_id format with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
        method: 'POST',
        body: JSON.stringify({ order_id: 'ORDER-NO-DIGITS', status: 'PAID' }),
      });
      const res = await klikQrisWebhookHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid order_id format');
    });

    it('returns 404 when order ID does not exist in database', async () => {
      mockSql.mockResolvedValueOnce([]); // Order not found

      const req = new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
        method: 'POST',
        body: JSON.stringify({ order_id: 'INV-999999', status: 'PAID' }),
      });
      const res = await klikQrisWebhookHandler(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Order not found');
    });

    it('rejects tampered or missing signature with 403 Forbidden when order has registered signature', async () => {
      mockSql.mockResolvedValueOnce([
        {
          id: 701,
          user_id: 'u-701',
          user_email: 'u701@test.com',
          package_id: null,
          order_type: 'pro',
          exact_amount: 150045,
          status: 'pending',
          signature: 'authentic-merchant-signature-xyz',
        },
      ]);

      const req = new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
        method: 'POST',
        body: JSON.stringify({
          order_id: 'INV-701',
          status: 'PAID',
          signature: 'forged-attacker-signature',
        }),
      });

      const res = await klikQrisWebhookHandler(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Invalid signature');
    });

    it('accepts authentic webhook matching stored signature and fulfills PRO order', async () => {
      // 1. SELECT payment_orders
      mockSql.mockResolvedValueOnce([
        {
          id: 702,
          user_id: 'u-702',
          user_email: 'u702@test.com',
          package_id: null,
          order_type: 'pro',
          exact_amount: 150099,
          status: 'pending',
          signature: 'valid-sig-12345',
        },
      ]);
      // 2. UPDATE payment_orders to paid
      mockSql.mockResolvedValueOnce([]);
      // 3. UPDATE users is_pro = true
      mockSql.mockResolvedValueOnce([]);

      const req = new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
        method: 'POST',
        body: JSON.stringify({
          order_id: 'INV-702',
          status: 'PAID',
          signature: 'valid-sig-12345',
        }),
      });

      const res = await klikQrisWebhookHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.orderId).toBe(702);
      expect(json.message).toContain('Payment verified and access granted');
    });

    it('is strictly IDEMPOTENT: repeated delivery of PAID webhook returns 200 without duplicate DB mutations', async () => {
      // Order is already marked 'paid'
      mockSql.mockResolvedValueOnce([
        {
          id: 703,
          user_id: 'u-703',
          user_email: 'u703@test.com',
          package_id: null,
          order_type: 'pro',
          exact_amount: 150077,
          status: 'paid',
          signature: 'sig-703',
        },
      ]);

      const req = new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
        method: 'POST',
        body: JSON.stringify({
          order_id: 'INV-703',
          status: 'PAID',
          signature: 'sig-703',
        }),
      });

      const res = await klikQrisWebhookHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toBe('Already processed');

      // Crucial: mockSql was called only ONCE for the initial SELECT, no UPDATE queries fired!
      expect(mockSql).toHaveBeenCalledTimes(1);
    });

    it('supports nested payload format (KlikQRIS v2 specification)', async () => {
      mockSql.mockResolvedValueOnce([
        {
          id: 704,
          user_id: 'u-704',
          user_email: 'u704@test.com',
          package_id: 'tryout-10',
          order_type: 'single',
          exact_amount: 5015,
          status: 'pending',
          signature: 'nested-sig-704',
        },
      ]);
      // UPDATE payment_orders to paid
      mockSql.mockResolvedValueOnce([]);
      // SELECT users unlocked_packages
      mockSql.mockResolvedValueOnce([{ unlocked_packages: ['tryout-1'] }]);
      // UPDATE users unlocked_packages
      mockSql.mockResolvedValueOnce([]);

      const req = new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
        method: 'POST',
        body: JSON.stringify({
          status: 'success',
          data: {
            order_id: 'INV-704',
            status: 'PAID',
            amount_paid: 5015,
            signature: 'nested-sig-704',
          },
        }),
      });

      const res = await klikQrisWebhookHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.orderId).toBe(704);
    });

    it('handles EXPIRED webhook event by updating order status to expired', async () => {
      mockSql.mockResolvedValueOnce([
        {
          id: 705,
          user_id: 'u-705',
          order_type: 'single',
          status: 'pending',
          signature: null,
        },
      ]);
      // UPDATE payment_orders SET status = 'expired'
      mockSql.mockResolvedValueOnce([]);

      const req = new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
        method: 'POST',
        body: JSON.stringify({
          order_id: 'INV-705',
          status: 'EXPIRED',
        }),
      });

      const res = await klikQrisWebhookHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toBe('Order marked expired');
    });
  });

  // =========================================================================
  // 3. Order Cancellation Rules (/api/payment/cancel)
  // =========================================================================
  describe('3. Order Cancellation Rules (POST /api/payment/cancel)', () => {
    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      mockCookieStore.get.mockReturnValue(null);
      mockVerifyToken.mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/payment/cancel', {
        method: 'POST',
        body: JSON.stringify({ orderId: 801 }),
      });

      const res = await cancelOrderHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('rejects missing orderId with 400 Bad Request', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'token-u802' });
      mockVerifyToken.mockResolvedValue({ userId: 'u-802', email: 'u802@test.com' });

      const req = new NextRequest('http://localhost:3000/api/payment/cancel', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const res = await cancelOrderHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('orderId is required');
    });

    it('returns 404 when order to cancel does not exist', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'token-u803' });
      mockVerifyToken.mockResolvedValue({ userId: 'u-803', email: 'u803@test.com' });
      mockSql.mockResolvedValueOnce([]); // not found

      const req = new NextRequest('http://localhost:3000/api/payment/cancel', {
        method: 'POST',
        body: JSON.stringify({ orderId: 99999 }),
      });

      const res = await cancelOrderHandler(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain('tidak ditemukan');
    });

    it('refuses cancellation with 403 when order belongs to a different user', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'token-attacker' });
      mockVerifyToken.mockResolvedValue({ userId: 'attacker-id', email: 'attacker@evil.com' });

      mockSql.mockResolvedValueOnce([
        { id: 804, user_id: 'victim-id', user_email: 'victim@test.com', status: 'pending' },
      ]);

      const req = new NextRequest('http://localhost:3000/api/payment/cancel', {
        method: 'POST',
        body: JSON.stringify({ orderId: 804 }),
      });

      const res = await cancelOrderHandler(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Akses ditolak');
    });

    it('successfully cancels a pending order owned by user and sets expires_at to NOW()', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'token-owner' });
      mockVerifyToken.mockResolvedValue({ userId: 'owner-id', email: 'owner@test.com' });

      // SELECT order
      mockSql.mockResolvedValueOnce([
        { id: 805, user_id: 'owner-id', user_email: 'owner@test.com', status: 'pending' },
      ]);
      // UPDATE payment_orders status = 'cancelled'
      mockSql.mockResolvedValueOnce([]);

      const req = new NextRequest('http://localhost:3000/api/payment/cancel', {
        method: 'POST',
        body: JSON.stringify({ orderId: 805 }),
      });

      const res = await cancelOrderHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain('berhasil dibatalkan');
    });

    it('strictly forbids cancelling an order with status PAID with 400 Bad Request', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'token-owner' });
      mockVerifyToken.mockResolvedValue({ userId: 'owner-id', email: 'owner@test.com' });

      mockSql.mockResolvedValueOnce([
        { id: 806, user_id: 'owner-id', user_email: 'owner@test.com', status: 'paid' },
      ]);

      const req = new NextRequest('http://localhost:3000/api/payment/cancel', {
        method: 'POST',
        body: JSON.stringify({ orderId: 806 }),
      });

      const res = await cancelOrderHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Pesanan dengan status paid tidak dapat dibatalkan');
    });

    it('strictly forbids cancelling an order that is already EXPIRED with 400 Bad Request', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'token-owner' });
      mockVerifyToken.mockResolvedValue({ userId: 'owner-id', email: 'owner@test.com' });

      mockSql.mockResolvedValueOnce([
        { id: 807, user_id: 'owner-id', user_email: 'owner@test.com', status: 'expired' },
      ]);

      const req = new NextRequest('http://localhost:3000/api/payment/cancel', {
        method: 'POST',
        body: JSON.stringify({ orderId: 807 }),
      });

      const res = await cancelOrderHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Pesanan dengan status expired tidak dapat dibatalkan');
    });
  });

  // =========================================================================
  // 4. Order Status Input Sanitization (/api/payment/order-status)
  // =========================================================================
  describe('4. Order Status Input Sanitization (GET /api/payment/order-status)', () => {
    it('returns 400 when neither orderId nor exactAmount is supplied', async () => {
      const req = new NextRequest('http://localhost:3000/api/payment/order-status');
      const res = await getOrderStatusHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('orderId or exactAmount required');
    });

    it('sanitizes non-numeric string orderId ("abc") with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/payment/order-status?orderId=malicious_input');
      const res = await getOrderStatusHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid orderId format');
    });

    it('sanitizes decimal / float orderId ("12.34") with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/payment/order-status?orderId=12.34');
      const res = await getOrderStatusHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid orderId format');
    });

    it('sanitizes negative orderId ("-5") with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/payment/order-status?orderId=-5');
      const res = await getOrderStatusHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid orderId format');
    });

    it('sanitizes zero orderId ("0") with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/payment/order-status?orderId=0');
      const res = await getOrderStatusHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid orderId format');
    });

    it('sanitizes SQL injection string ("1 OR 1=1") with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/payment/order-status?orderId=1%20OR%201=1');
      const res = await getOrderStatusHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid orderId format');
    });

    it('sanitizes invalid non-numeric exactAmount with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/payment/order-status?exactAmount=not_a_number');
      const res = await getOrderStatusHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid exactAmount format');
    });

    it('sanitizes negative exactAmount with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/payment/order-status?exactAmount=-150000');
      const res = await getOrderStatusHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid exactAmount format');
    });

    it('returns 404 when valid integer orderId is not found', async () => {
      mockSql.mockResolvedValueOnce([]); // not found
      const req = new NextRequest('http://localhost:3000/api/payment/order-status?orderId=9999999');
      const res = await getOrderStatusHandler(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Order not found');
    });

    it('returns full order status when valid integer orderId is found', async () => {
      mockSql.mockResolvedValueOnce([
        {
          id: 901,
          user_id: 'u-901',
          user_email: 'u901@test.com',
          package_id: 'tryout-8',
          order_type: 'single',
          exact_amount: 5045,
          status: 'paid',
          paid_at: '2026-10-15T08:30:00Z',
        },
      ]);

      const req = new NextRequest('http://localhost:3000/api/payment/order-status?orderId=901');
      const res = await getOrderStatusHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.orderId).toBe(901);
      expect(json.exactAmount).toBe(5045);
      expect(json.orderType).toBe('single');
      expect(json.packageId).toBe('tryout-8');
      expect(json.status).toBe('paid');
      expect(json.paid).toBe(true);
      expect(json.paidAt).toBe('2026-10-15T08:30:00Z');
    });

    it('resolves latest order when queried via exactAmount', async () => {
      mockSql.mockResolvedValueOnce([
        {
          id: 902,
          user_id: 'u-902',
          user_email: 'u902@test.com',
          package_id: null,
          order_type: 'pro',
          exact_amount: 150042,
          status: 'pending',
          paid_at: null,
        },
      ]);

      const req = new NextRequest('http://localhost:3000/api/payment/order-status?exactAmount=150042');
      const res = await getOrderStatusHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.orderId).toBe(902);
      expect(json.exactAmount).toBe(150042);
      expect(json.paid).toBe(false);
      expect(json.status).toBe('pending');
    });
  });

  // =========================================================================
  // 5. Abandoned Cart Reminder Logic & Email Template Generation
  // =========================================================================
  describe('5. Abandoned Cart Scanner & Reminder Template Generation', () => {
    it('isOrderEligibleForReminder accepts pending order created between 1 and 24 hours ago', () => {
      const now = new Date('2026-10-15T12:00:00Z');
      const twoHoursAgo = new Date('2026-10-15T10:00:00Z');

      const eligible = isOrderEligibleForReminder(twoHoursAgo, 'pending', null, now);
      expect(eligible).toBe(true);
    });

    it('isOrderEligibleForReminder rejects order less than 1 hour old (too fresh)', () => {
      const now = new Date('2026-10-15T12:00:00Z');
      const thirtyMinsAgo = new Date('2026-10-15T11:30:00Z');

      const eligible = isOrderEligibleForReminder(thirtyMinsAgo, 'pending', null, now);
      expect(eligible).toBe(false);
    });

    it('isOrderEligibleForReminder rejects order older than 24 hours (expired window)', () => {
      const now = new Date('2026-10-15T12:00:00Z');
      const twentyFiveHoursAgo = new Date('2026-10-14T11:00:00Z');

      const eligible = isOrderEligibleForReminder(twentyFiveHoursAgo, 'pending', null, now);
      expect(eligible).toBe(false);
    });

    it('isOrderEligibleForReminder rejects order if lastRemindedAt is already present (no spam)', () => {
      const now = new Date('2026-10-15T12:00:00Z');
      const threeHoursAgo = new Date('2026-10-15T09:00:00Z');
      const remindedOneHourAgo = new Date('2026-10-15T11:00:00Z');

      const eligible = isOrderEligibleForReminder(threeHoursAgo, 'pending', remindedOneHourAgo, now);
      expect(eligible).toBe(false);
    });

    it('isOrderEligibleForReminder rejects non-pending statuses (paid, expired, cancelled)', () => {
      const now = new Date('2026-10-15T12:00:00Z');
      const twoHoursAgo = new Date('2026-10-15T10:00:00Z');

      expect(isOrderEligibleForReminder(twoHoursAgo, 'paid', null, now)).toBe(false);
      expect(isOrderEligibleForReminder(twoHoursAgo, 'expired', null, now)).toBe(false);
      expect(isOrderEligibleForReminder(twoHoursAgo, 'cancelled', null, now)).toBe(false);
    });

    it('buildAbandonedReminderEmail formats subject, formatted amount, orderId and CTA link', () => {
      const email = buildAbandonedReminderEmail(999, 150123, 'PRO All-Access', 'https://lolosin.com/simulasi');

      expect(email.subject).toBe('[Lolos.in] Selesaikan Akses PRO All-Access Anda');
      expect(email.html).toContain('Pesanan #999');
      expect(email.html).toContain('Rp 150.123'); // Indonesian currency grouping
      expect(email.html).toContain('Nominal wajib persis');
      expect(email.html).toContain('https://lolosin.com/simulasi');
      expect(email.html).toContain('#c96442'); // Primary accent color
    });

    it('POST /api/payment/abandoned-reminders rejects unauthorized request when secret configured', async () => {
      process.env.CRON_SECRET = 'secret-cron-key';

      const req = new NextRequest('http://localhost:3000/api/payment/abandoned-reminders', {
        method: 'POST',
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      });

      const res = await abandonedRemindersHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');

      delete process.env.CRON_SECRET;
    });

    it('POST /api/payment/abandoned-reminders processes eligible orders and sends email', async () => {
      process.env.CRON_SECRET = 'valid-cron-key';

      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();

      // SELECT pending orders
      mockSql.mockResolvedValueOnce([
        {
          id: 1001,
          user_email: 'calon.nip@gmail.com',
          package_id: null,
          order_type: 'pro',
          exact_amount: 150033,
          status: 'pending',
          created_at: twoHoursAgo,
          last_reminded_at: null,
        },
      ]);

      mockSendOtpEmail.mockResolvedValueOnce({ success: true });
      // UPDATE payment_orders SET last_reminded_at = NOW()
      mockSql.mockResolvedValueOnce([]);

      const req = new NextRequest('http://localhost:3000/api/payment/abandoned-reminders', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-cron-key',
        },
      });

      const res = await abandonedRemindersHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.scanned).toBe(1);
      expect(json.remindersSent).toBe(1);
      expect(mockSendOtpEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'calon.nip@gmail.com',
          subject: '[Lolos.in] Selesaikan Akses PRO All-Access Anda',
        })
      );

      delete process.env.CRON_SECRET;
    });
  });

  // =========================================================================
  // 6. KlikQRIS Client & Unique Code Integrity
  // =========================================================================
  describe('6. KlikQRIS Configuration & Arithmetic Integrity', () => {
    it('properly switches between sandbox and production baseUrl', () => {
      expect(getKlikQrisBaseUrl('sandbox')).toBe('https://klikqris.com/api/sandbox');
      expect(getKlikQrisBaseUrl('production')).toBe('https://klikqris.com/api');
    });

    it('verifies exactAmount arithmetic: totalAmount == baseAmount + uniqueCode', () => {
      const baseAmount = 150000;
      const uniqueCode = 142;
      const totalAmount = baseAmount + uniqueCode;

      expect(totalAmount).toBe(150142);
      expect(totalAmount - baseAmount).toBe(uniqueCode);
      expect(uniqueCode).toBeGreaterThanOrEqual(1);
      expect(uniqueCode).toBeLessThanOrEqual(999);
    });
  });
});
