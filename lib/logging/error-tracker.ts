// Global Error Tracking & Logging
// Centralized error collection for monitoring and alerting

import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/notifications/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface ErrorLog {
  id?: string
  endpoint: string
  method: string
  status: number
  error: string
  stack?: string
  userId?: string
  timestamp?: string
  severity: 'info' | 'warning' | 'error' | 'critical'
}

// Error thresholds
const ALERT_THRESHOLDS = {
  error_rate: 0.05, // 5% error rate
  critical_count: 3, // 3 critical errors
  critical_within_minutes: 5, // within 5 minutes
}

/**
 * Log error to database + send alerts if threshold reached
 */
export async function logError(error: ErrorLog): Promise<void> {
  const errorWithTimestamp = {
    ...error,
    timestamp: error.timestamp || new Date().toISOString(),
  }

  try {
    // Insert into database
    const { error: dbError } = await supabase.from('error_logs').insert([errorWithTimestamp])

    if (dbError) {
      console.error('[error-tracker] Failed to log error:', dbError)
      return
    }

    // Check if we should alert
    await checkAndAlert(errorWithTimestamp)
  } catch (err) {
    console.error('[error-tracker] Exception:', err)
  }
}

/**
 * Check error thresholds and send alerts
 */
async function checkAndAlert(currentError: ErrorLog & { timestamp: string }): Promise<void> {
  // Alert on critical errors immediately
  if (currentError.severity === 'critical') {
    await sendTelegramMessage({
      chat_id: process.env.TELEGRAM_IT_TEAM_CHAT_ID || '',
      text: `<b>🚨 CRITICAL ERROR</b>\n\nEndpoint: ${currentError.endpoint}\nStatus: ${currentError.status}\nError: ${currentError.error}\n\nTime: ${currentError.timestamp}`,
      parse_mode: 'HTML',
    })
    return
  }

  // Check for error spike (multiple errors in short time)
  const fiveMinutesAgo = new Date(Date.now() - ALERT_THRESHOLDS.critical_within_minutes * 60000)

  try {
    const { data: recentErrors } = await supabase
      .from('error_logs')
      .select()
      .eq('endpoint', currentError.endpoint)
      .eq('severity', 'error')
      .gte('timestamp', fiveMinutesAgo.toISOString())

    if ((recentErrors?.length || 0) >= ALERT_THRESHOLDS.critical_count) {
      await sendTelegramMessage({
        chat_id: process.env.TELEGRAM_IT_TEAM_CHAT_ID || '',
        text: `<b>⚠️ ERROR SPIKE DETECTED</b>\n\nEndpoint: ${currentError.endpoint}\nErrors in last 5 min: ${recentErrors?.length || 0}\n\nInvestigate: /api/health?detailed=true`,
        parse_mode: 'HTML',
      })
    }
  } catch (err) {
    console.error('[error-tracker] Failed to check thresholds:', err)
  }
}

/**
 * Middleware for API error tracking
 */
export function createErrorLogger(endpoint: string, method: string) {
  return (error: any, status: number = 500) => {
    const errorLog: ErrorLog = {
      endpoint,
      method,
      status,
      error: error?.message || String(error),
      stack: error?.stack,
      severity: status >= 500 ? 'critical' : status >= 400 ? 'warning' : 'error',
      timestamp: new Date().toISOString(),
    }

    // Log asynchronously (don't block response)
    logError(errorLog).catch(err => console.error('[logger] Async log failed:', err))
  }
}
