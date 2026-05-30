// Performance Monitoring
// Track API response times and identify slow endpoints

import { createClient } from '@supabase/supabase-js'

interface PerformanceMetric {
  endpoint: string
  method: string
  responseTime: number
  timestamp?: string
  statusCode?: number
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Thresholds (milliseconds)
const SLOW_THRESHOLD = 1000 // 1 second = slow
const VERY_SLOW_THRESHOLD = 3000 // 3 seconds = critical

/**
 * Record performance metric
 */
export async function recordPerformance(metric: PerformanceMetric): Promise<void> {
  const metricWithTimestamp = {
    ...metric,
    timestamp: metric.timestamp || new Date().toISOString(),
  }

  try {
    // Insert into database
    const { error } = await supabase.from('performance_metrics').insert([metricWithTimestamp])

    if (error) {
      console.error('[perf] Failed to record metric:', error)
      return
    }

    // Check if we should alert on slow responses
    if (metric.responseTime > VERY_SLOW_THRESHOLD) {
      await alertSlowEndpoint(metric, 'very_slow')
    } else if (metric.responseTime > SLOW_THRESHOLD) {
      await alertSlowEndpoint(metric, 'slow')
    }
  } catch (err) {
    console.error('[perf] Exception:', err)
  }
}

/**
 * Alert on slow endpoint
 */
async function alertSlowEndpoint(metric: PerformanceMetric, severity: 'slow' | 'very_slow'): Promise<void> {
  const { sendTelegramMessage } = await import('@/lib/notifications/telegram')

  const icon = severity === 'very_slow' ? '🚨' : '⚠️'
  const threshold = severity === 'very_slow' ? VERY_SLOW_THRESHOLD : SLOW_THRESHOLD

  try {
    await sendTelegramMessage({
      chat_id: process.env.TELEGRAM_IT_TEAM_CHAT_ID || '',
      text: `${icon} <b>SLOW ENDPOINT DETECTED</b>\n\nEndpoint: ${metric.method} ${metric.endpoint}\nResponse Time: ${metric.responseTime}ms\nThreshold: ${threshold}ms\n\nStatus: ${metric.statusCode || 'N/A'}`,
      parse_mode: 'HTML',
    })
  } catch (err) {
    console.error('[perf] Failed to send alert:', err)
  }
}

/**
 * Get performance stats for an endpoint
 */
export async function getEndpointStats(endpoint: string): Promise<{
  avg: number
  min: number
  max: number
  count: number
  p95: number
} | null> {
  try {
    const { data } = await supabase
      .from('performance_metrics')
      .select('responseTime')
      .eq('endpoint', endpoint)
      .order('timestamp', { ascending: false })
      .limit(100)

    if (!data || data.length === 0) {
      return null
    }

    const times = data.map(d => d.responseTime).sort((a, b) => a - b)
    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const p95Index = Math.floor(times.length * 0.95)

    return {
      avg: Math.round(avg),
      min: times[0],
      max: times[times.length - 1],
      count: times.length,
      p95: times[p95Index],
    }
  } catch (err) {
    console.error('[perf] Failed to get stats:', err)
    return null
  }
}

/**
 * Middleware to measure response time
 */
export function measureResponseTime(endpoint: string, method: string) {
  return (startTime: number, statusCode: number) => {
    const responseTime = Date.now() - startTime

    // Record asynchronously (don't block response)
    recordPerformance({
      endpoint,
      method,
      responseTime,
      statusCode,
      timestamp: new Date().toISOString(),
    }).catch(err => console.error('[perf] Recording failed:', err))
  }
}
