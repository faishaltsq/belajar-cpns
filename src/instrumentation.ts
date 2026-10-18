import * as Sentry from "@sentry/nextjs";

// Next.js instrumentation hook (stable in 14.2, no experimental flag needed).
// Loads the right runtime init (Node vs Edge) and captures App-Router request
// errors (server component / route handler failures) into Sentry.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors thrown in Server Components, Route Handlers and Server Actions.
export const onRequestError = Sentry.captureRequestError;
