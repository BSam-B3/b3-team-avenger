// System Health Check Endpoint
// GET /api/health → Overall system status
// GET /api/health?detailed=true → Detailed diagnostics

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical'
  timestamp: string
  uptime: number
  services: {
    supabase: { status: string; latency: number }
    telegram: { status: string; configured: boolean }
    environment: { status: string; keysConfigured: number }
    cache: { status: string; type: string }
  }
  endpoints: {
    morning_brief: string
    email_secretary: string
    quotation_system: string
    voice_gateway: string
    admin_panel: string
  }
}

export async function GET(req: NextRequest) {
  const detailed = req.nextUrl.searchParams.get('detailed') === 'true'
  const startTime = Date.now()

  try {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        supabase: { status: 'checking', latency: 0 },
        telegram: { status: 'checking', configured: !!process.env.TELEGRAM_BOT_TOKEN },
        environment: { status: 'ok', keysConfigured: countConfiguredKeys() },
        cache: { status: 'ok', type: process.env.REDIS_URL ? 'redis' : 'memory' },
      },
      endpoints: {
        morning_brief: '✅ Cron 01:00 UTC (08:00 ICT)',
        email_secretary: '✅ Cron 02:00 UTC (09:00 ICT)',
        quotation_system: '✅ /api/quotation/*',
        voice_gateway: '✅ /api/mobile/voice',
        admin_panel: '✅ /admin',
      },
    }

    // Check Supabase
    const dbStart = Date.now()
    try {
      const { error } = await supabase.from('notifications_log').select('count', { count: 'exact' }).limit(1)
      health.services.supabase = {
        status: error ? 'error' : 'ok',
        latency: Date.now() - dbStart,
      }
    } catch (e) {
      health.services.supabase = { status: 'error', latency: Date.now() - dbStart }
      health.status = 'degraded'
    }

    // Check critical environment
    if (health.services.environment.keysConfigured < 10) {
      health.services.environment.status = 'warning'
      health.status = 'degraded'
    }

    // Check Telegram
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      health.services.telegram.status = 'unconfigured'
      health.status = 'degraded'
    } else {
      health.services.telegram.status = 'ok'
    }

    const totalTime = Date.now() - startTime

    if (detailed) {
      return NextResponse.json({
        ...health,
        diagnostics: {
          responseTime: totalTime,
          nodeVersion: process.version,
          environment: process.env.NODE_ENV,
          deployment: process.env.VERCEL_URL ? 'vercel' : 'local',
        },
      })
    }

    return NextResponse.json({
      status: health.status,
      timestamp: health.timestamp,
      responseTime: totalTime,
    })
  } catch (err) {
    console.error('[health] check failed:', err)
    return NextResponse.json(
      {
        status: 'critical',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

function countConfiguredKeys(): number {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
    'ADMIN_API_KEY',
    'MOBILE_API_KEY',
    'GROQ_API_KEY',
    'GEMINI_API_KEY',
    'AZURE_CLIENT_ID',
    'AZURE_TENANT_ID',
  ]

  return required.filter(key => !!process.env[key]).length
}
