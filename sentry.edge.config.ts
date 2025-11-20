import * as Sentry from '@sentry/nextjs'

/**
 * Sentry Edge Configuration
 *
 * Captures errors in Edge Runtime (middleware, edge functions).
 * To enable, set SENTRY_DSN in your environment variables.
 */

const SENTRY_DSN = process.env.SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Environment
    environment: process.env.NODE_ENV,
  })
}
