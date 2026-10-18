import * as Sentry from "@sentry/nextjs";

// Edge runtime init (Edge API routes / middleware). Imported by instrumentation.ts
// register() when NEXT_RUNTIME === 'edge'.
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  tracesSampleRate: 0.1,
  enabled: !!dsn,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  sendDefaultPii: false,
});
