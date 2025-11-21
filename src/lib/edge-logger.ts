/**
 * Edge-Compatible Logging
 *
 * Lightweight logging for Edge runtime without Node.js crypto dependency.
 * Uses Web Crypto API for UUID generation.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface EdgeLogContext {
  requestId?: string
  userId?: string
  duration?: number
  metadata?: Record<string, unknown>
}

export interface EdgeLogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context: EdgeLogContext
  environment: string
  service: string
}

/**
 * Generate UUID using Web Crypto API (Edge-compatible)
 */
function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

class EdgeLogger {
  private serviceName: string
  private environment: string
  private requestId?: string

  constructor() {
    this.serviceName = 'shipsensei'
    this.environment = process.env.NODE_ENV || 'development'
  }

  /**
   * Set request ID for this logger instance
   */
  setRequestId(requestId: string): EdgeLogger {
    const newLogger = new EdgeLogger()
    newLogger.requestId = requestId
    newLogger.serviceName = this.serviceName
    newLogger.environment = this.environment
    return newLogger
  }

  /**
   * Generate a new request ID
   */
  generateRequestId(): string {
    return generateRequestId()
  }

  /**
   * Log structured message (Edge-compatible)
   */
  private log(level: LogLevel, message: string, context: EdgeLogContext = {}) {
    const logEntry: EdgeLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        requestId: this.requestId || context.requestId,
        ...context,
      },
      environment: this.environment,
      service: this.serviceName,
    }

    // In development, pretty print. In production, JSON lines
    if (this.environment === 'development') {
      const contextStr = JSON.stringify(logEntry.context, null, 2)
      console.log(`[${level.toUpperCase()}] ${message}`)
      if (Object.keys(logEntry.context).length > 0) {
        console.log(`Context: ${contextStr}`)
      }
    } else {
      // Production JSON lines format for log aggregation
      console.log(JSON.stringify(logEntry))
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: EdgeLogContext) {
    this.log('info', message, context)
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: EdgeLogContext) {
    this.log('warn', message, context)
  }

  /**
   * Error level logging
   */
  error(message: string, context?: EdgeLogContext) {
    this.log('error', message, context)
  }

  /**
   * Log security events (simplified for Edge)
   */
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context: EdgeLogContext = {}
  ) {
    const level =
      severity === 'critical' || severity === 'high' ? 'error' : 'warn'

    this.log(level, `Security event: ${event}`, {
      ...context,
      securityEvent: event,
      severity,
    })
  }

  /**
   * Log API requests (simplified for Edge)
   */
  logApiRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context: EdgeLogContext = {}
  ) {
    const level = statusCode >= 400 ? 'warn' : 'info'

    this.log(level, `API ${method} ${url} - ${statusCode}`, {
      ...context,
      method,
      url,
      statusCode,
      duration,
    })
  }
}

// Create singleton logger instance
export const edgeLogger = new EdgeLogger()

/**
 * Middleware function to add request ID to requests (Edge-compatible)
 */
export function withRequestId() {
  return edgeLogger.generateRequestId()
}

/**
 * Create logger instance with request ID (Edge-compatible)
 */
export function createRequestLogger(requestId?: string): EdgeLogger {
  const id = requestId || edgeLogger.generateRequestId()
  return edgeLogger.setRequestId(id)
}
