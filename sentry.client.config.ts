import * as Sentry from "@sentry/nextjs";

// Client (browser) init. On Next 14 the bundler (withSentryConfig) injects this
// file into the client entry. DSN comes from NEXT_PUBLIC_* so it is inlined.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  // Keep performance traces sparse: errors are always captured regardless of
  // tracesSampleRate, and transactions count against the free-tier quota.
  tracesSampleRate: 0.1,
  // Replay is off (free tier + payload budget). Only unhandled errors would
  // need it; we don't enable it.
  enabled: !!dsn,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  // Don't double-report client errors that the server also sees.
  sendDefaultPii: false,
});
