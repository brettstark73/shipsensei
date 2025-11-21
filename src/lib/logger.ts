import { randomUUID } from 'crypto'

/**
 * Structured Logging and Observability System
 *
 * Provides structured logging with request IDs, metrics, and observability
 * for production debugging and monitoring
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  requestId?: string
  userId?: string
  operation?: string
  duration?: number
  metadata?: Record<string, unknown>
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context: LogContext
  environment: string
  service: string
}

class Logger {
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
  setRequestId(requestId: string): Logger {
    const newLogger = new Logger()
    newLogger.requestId = requestId
    newLogger.serviceName = this.serviceName
    newLogger.environment = this.environment
    return newLogger
  }

  /**
   * Generate a new request ID
   */
  generateRequestId(): string {
    return randomUUID()
  }

  /**
   * Log structured message
   */
  private log(level: LogLevel, message: string, context: LogContext = {}) {
    const logEntry: LogEntry = {
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
   * Debug level logging
   */
  debug(message: string, context?: LogContext) {
    this.log('debug', message, context)
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  /**
   * Error level logging
   */
  error(message: string, context?: LogContext) {
    this.log('error', message, context)
  }

  /**
   * Time operation and log duration
   */
  async timeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    context: LogContext = {}
  ): Promise<T> {
    const startTime = Date.now()

    this.info(`Starting operation: ${operation}`, {
      ...context,
      operation,
    })

    try {
      const result = await fn()
      const duration = Date.now() - startTime

      this.info(`Completed operation: ${operation}`, {
        ...context,
        operation,
        duration,
        success: true,
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      this.error(`Failed operation: ${operation}`, {
        ...context,
        operation,
        duration,
        success: false,
        error: errorMessage,
      })

      throw error
    }
  }

  /**
   * Log API request metrics
   */
  logApiRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context: LogContext = {}
  ) {
    const level = statusCode >= 400 ? 'warn' : 'info'

    this.log(level, `API ${method} ${url} - ${statusCode}`, {
      ...context,
      operation: 'api_request',
      method,
      url,
      statusCode,
      duration,
    })
  }

  /**
   * Log database operations
   */
  logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    context: LogContext = {}
  ) {
    this.info(`Database ${operation} on ${table}`, {
      ...context,
      operation: 'database',
      dbOperation: operation,
      table,
      duration,
    })
  }

  /**
   * Log security events
   */
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context: LogContext = {}
  ) {
    const level =
      severity === 'critical' || severity === 'high' ? 'error' : 'warn'

    this.log(level, `Security event: ${event}`, {
      ...context,
      operation: 'security',
      securityEvent: event,
      severity,
    })
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetric(
    metric: string,
    value: number,
    unit: string = 'ms',
    context: LogContext = {}
  ) {
    this.info(`Performance metric: ${metric}`, {
      ...context,
      operation: 'performance',
      metric,
      value,
      unit,
    })
  }
}

// Create singleton logger instance
export const logger = new Logger()

/**
 * Middleware function to add request ID to requests
 */
export function withRequestId() {
  return logger.generateRequestId()
}

/**
 * Create logger instance with request ID
 */
export function createRequestLogger(requestId?: string): Logger {
  const id = requestId || logger.generateRequestId()
  return logger.setRequestId(id)
}

/**
 * Performance timing utility
 */
export class PerformanceTimer {
  private startTime: number
  private logger: Logger

  constructor(logger: Logger) {
    this.startTime = Date.now()
    this.logger = logger
  }

  /**
   * End timing and log result
   */
  end(operation: string, context: LogContext = {}) {
    const duration = Date.now() - this.startTime
    this.logger.logPerformanceMetric(operation, duration, 'ms', context)
    return duration
  }
}

/**
 * Create performance timer
 */
export function createTimer(logger: Logger = logger): PerformanceTimer {
  return new PerformanceTimer(logger)
}
