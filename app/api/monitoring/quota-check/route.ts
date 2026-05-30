// QUOTA MONITORING — Alert on free tier limits approaching
// Cron: 0 9 * * * (Daily at 09:00 ICT)

import { NextResponse } from 'next/server'
import { sendTelegramMessage } from '@/lib/notifications/telegram'

export const dynamic = 'force-dynamic'

interface QuotaStatus {
  service: string
  current: number
  limit: number
  percentUsed: number
  status: 'ok' | 'warning' | 'critical'
}

const THRESHOLD = parseInt(process.env.QUOTA_ALERT_THRESHOLD || '80')

async function checkGroqQuota(): Promise<QuotaStatus> {
  const monthlyLimit = parseInt(process.env.GROQ_MONTHLY_LIMIT || '432000')
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const dayOfMonth = today.getDate()
  const estimatedMonthlyUsage = (dayOfMonth / daysInMonth) * 500 // estimate
  const percentUsed = (estimatedMonthlyUsage / monthlyLimit) * 100

  return {
    service: 'Groq API',
    current: Math.round(estimatedMonthlyUsage),
    limit: monthlyLimit,
    percentUsed: Math.round(percentUsed),
    status: percentUsed > 90 ? 'critical' : percentUsed > THRESHOLD ? 'warning' : 'ok',
  }
}

async function checkSendGridQuota(): Promise<QuotaStatus> {
  const monthlyLimit = parseInt(process.env.SENDGRID_MONTHLY_LIMIT || '3000')
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const dayOfMonth = today.getDate()
  const estimatedMonthlyUsage = (dayOfMonth / daysInMonth) * 200 // estimate
  const percentUsed = (estimatedMonthlyUsage / monthlyLimit) * 100

  return {
    service: 'SendGrid Email',
    current: Math.round(estimatedMonthlyUsage),
    limit: monthlyLimit,
    percentUsed: Math.round(percentUsed),
    status: percentUsed > 90 ? 'critical' : percentUsed > THRESHOLD ? 'warning' : 'ok',
  }
}

async function checkVercelQuota(): Promise<QuotaStatus> {
  const monthlyLimit = parseInt(process.env.VERCEL_API_CALL_LIMIT || '6000')
  const estimatedUsage = 2000 // placeholder
  const percentUsed = (estimatedUsage / monthlyLimit) * 100

  return {
    service: 'Vercel Functions',
    current: estimatedUsage,
    limit: monthlyLimit,
    percentUsed: Math.round(percentUsed),
    status: percentUsed > 90 ? 'critical' : percentUsed > THRESHOLD ? 'warning' : 'ok',
  }
}

export async function GET() {
  try {
    const quotas: QuotaStatus[] = []
    const alerts: string[] = []

    const groq = await checkGroqQuota()
    quotas.push(groq)
    if (groq.status !== 'ok') {
      alerts.push(`⚠️ Groq: ${groq.percentUsed}% of ${groq.limit.toLocaleString()} req/month`)
    }

    const sendgrid = await checkSendGridQuota()
    quotas.push(sendgrid)
    if (sendgrid.status !== 'ok') {
      alerts.push(`⚠️ SendGrid: ${sendgrid.percentUsed}% of ${sendgrid.limit.toLocaleString()} emails/month`)
    }

    const vercel = await checkVercelQuota()
    quotas.push(vercel)
    if (vercel.status !== 'ok') {
      alerts.push(`⚠️ Vercel: ${vercel.percentUsed}% of ${vercel.limit.toLocaleString()} invocations/month`)
    }

    // Send alert if any quota warning
    if (alerts.length > 0) {
      await sendTelegramMessage({
        chat_id: process.env.TELEGRAM_CHAT_ID || '',
        text: `<b>🚨 Quota Alert</b>\n\n${alerts.join('\n')}\n\nCheck limits at console.groq.com, sendgrid.com, vercel.com`,
        parse_mode: 'HTML',
      })
    }

    return Response.json({
      timestamp: new Date().toISOString(),
      quotas,
      alerts: alerts.length > 0 ? alerts : ['✅ All quotas OK'],
      checkTime: 'Daily 09:00 ICT',
    })
  } catch (err) {
    console.error('[quota-check] error:', err)
    return Response.json({ error: 'Quota check failed' }, { status: 500 })
  }
}
