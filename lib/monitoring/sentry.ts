// Sentry error tracking setup (optional)
let Sentry: any = null

try {
  Sentry = require('@sentry/nextjs')
} catch {
  // Sentry is optional, continue without it
}

export function initializeSentry() {
  if (!Sentry) return

  if (typeof window === 'undefined') {
    // Server-side initialization
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection(),
      ],
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'originalCreateNotification',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
        // Random plugins/extensions
        'chrome://',
        'moz-extension://',
      ],
    })
  }
}

export function captureException(error: Error, context?: Record<string, any>) {
  if (!Sentry) return

  Sentry.captureException(error, {
    contexts: {
      additional: context,
    },
  })
}

export function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' = 'info') {
  if (!Sentry) return

  Sentry.captureMessage(message, level)
}

export function addBreadcrumb(message: string, data?: Record<string, any>, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info') {
  if (!Sentry) return

  Sentry.addBreadcrumb({
    message,
    data,
    level,
    timestamp: Date.now() / 1000,
  })
}

export function withSentryErrorHandler(handler: Function) {
  return async (...args: any[]) => {
    try {
      addBreadcrumb(`Handler: ${handler.name}`, { args: args.length })
      return await handler(...args)
    } catch (err) {
      captureException(err as Error, { handler: handler.name })
      throw err
    }
  }
}

// API error logger
export interface ApiErrorLog {
  endpoint: string
  method: string
  status: number
  error: string
  userId?: string
  duration: number
}

export function logApiError(data: ApiErrorLog) {
  if (data.status >= 500) {
    captureMessage(`API Error: ${data.method} ${data.endpoint} (${data.status})`, 'error')
  } else if (data.status >= 400) {
    addBreadcrumb(`API Error: ${data.method} ${data.endpoint}`, data, 'warning')
  }

  // Send to analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('event', 'api_error', {
      endpoint: data.endpoint,
      method: data.method,
      status: data.status,
      duration: data.duration,
    })
  }
}

// Performance monitoring
export function measureDuration(label: string) {
  const start = Date.now()
  return () => {
    const duration = Date.now() - start
    if (duration > 1000) {
      addBreadcrumb(`Slow operation: ${label}`, { duration }, 'warning')
    }
    return duration
  }
}
