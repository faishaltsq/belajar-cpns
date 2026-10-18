import * as Sentry from "@sentry/nextjs";

// Server (Node runtime) init. Imported by instrumentation.ts register().
// This is where webhook/payment-route errors get captured.
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  tracesSampleRate: 0.1,
  enabled: !!dsn,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  sendDefaultPii: false,
});
