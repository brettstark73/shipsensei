import * as Sentry from '@sentry/nextjs'

/**
 * Sentry Server Configuration
 *
 * Captures errors on the server-side (API routes, SSR, etc).
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

    // Ignore certain errors that aren't actionable
    ignoreErrors: [
      // Database connection errors during graceful shutdown
      'P2028',
      // NextAuth.js expected errors
      'OAuthCallbackError',
    ],

    beforeSend(event, hint) {
      // Filter out errors from bots/crawlers
      const userAgent = event.request?.headers?.['user-agent']
      if (userAgent && /bot|crawler|spider/i.test(userAgent)) {
        return null
      }

      return event
    },
  })
}
