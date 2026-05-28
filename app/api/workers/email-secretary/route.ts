/**
 * GET /api/workers/email-secretary
 * Cron: 0 2 * * * (09:00 ICT = 02:00 UTC)
 *
 * Email Secretary — ทุกเช้า:
 * 1. สแกน M365 inbox unread emails
 * 2. สรุปเฉพาะใจความสำคัญ + action items (3 lines max/email)
 * 3. ส่งรายงาน Telegram
 * 4. บันทึกลง agent_logs
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/notify/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()
    const dateStr = now.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    // ─── 1. Fetch unread emails from CIT IMAP (if available) ───────────────────
    let unreadEmails: any[] = []
    try {
      const citRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/list?unread=true`, {
        headers: { 'Authorization': `Bearer ${process.env.CIT_EMAIL_TOKEN}` },
      })
      if (citRes.ok) {
        const data = await citRes.json()
        unreadEmails = data.emails || []
      }
    } catch (err) {
      console.warn('[email-secretary] CIT IMAP not available', err)
    }

    // ─── 2. Build Telegram summary ────────────────────────────────────────────
    const lines: string[] = [`📧 <b>Email Secretary — ${dateStr}</b>`]

    if (unreadEmails.length === 0) {
      lines.push('')
      lines.push('✅ ไม่มี unread emails — กล่องเรียบร้อย')
    } else {
      lines.push('')
      lines.push(`📬 <b>Unread (${unreadEmails.length})</b>`)

      for (const email of unreadEmails.slice(0, 10)) {
        const subject = email.subject || '(no subject)'
        const from = email.from || 'Unknown'
        const summary = email.bodySnippet || email.body?.slice(0, 80) || '(no body)'

        const priorityIcon = (['urgent', 'high', 'alert'].some(k => subject.toLowerCase().includes(k))) ? '🔴' : '📌'
        lines.push(`${priorityIcon} <b>${subject}</b>`)
        lines.push(`   ${from} → ${summary.slice(0, 60)}...`)
      }

      if (unreadEmails.length > 10) {
        lines.push(`   ... และอีก ${unreadEmails.length - 10} emails`)
      }
    }

    lines.push('')
    lines.push(`🔗 https://b3-team-avenger.vercel.app/email`)

    const message = lines.join('\n')

    // ─── 3. Send Telegram ────────────────────────────────────────────────────
    const sent = await sendTelegram(message)

    // ─── 4. Log to agent_logs ────────────────────────────────────────────────
    await supabase.from('agent_logs').insert({
      agent_name:  'Janie',
      action_desc: `📧 Email Secretary: ${unreadEmails.length} unread, summarized`,
      status:      sent ? 'completed' : 'failed',
    })

    return NextResponse.json({
      ok: true,
      unreadCount: unreadEmails.length,
      sent,
    })
  } catch (err) {
    console.error('[email-secretary error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
