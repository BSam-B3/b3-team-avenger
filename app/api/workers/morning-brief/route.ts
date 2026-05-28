/**
 * GET /api/workers/morning-brief
 * Cron: 0 1 * * * (08:00 ICT = 01:00 UTC)
 *
 * ทำทุกเช้า:
 * 1. ดู Google Calendar — วันนี้มีนัดอะไรบ้าง
 * 2. ถ้ามีนัด on-site → แจ้ง Telegram พร้อมรายละเอียด
 * 3. สรุป tasks ที่ค้างอยู่จาก Supabase
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { listCalendarEvents } from '@/lib/calendar/google'
import { sendTelegram } from '@/lib/notify/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const ONSITE_KEYWORDS = ['on-site', 'ออนไซท์', 'เข้าพื้นที่', 'ลงพื้นที่', 'ไปหา', 'นัดลูกค้า', 'onsite', 'visit']

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    // ─── 1. Get today's calendar events ───────────────────────────────────────
    const events = await listCalendarEvents(20)
    const todayEvents = events.filter(e => {
      const start = new Date(e.start?.dateTime ?? e.start?.date ?? '')
      return start >= today && start < new Date(today.getTime() + 86400000)
    })

    // ─── 2. Get open tickets ──────────────────────────────────────────────────
    const { data: openTickets } = await supabase
      .from('support_tickets')
      .select('id, title, priority, customer_name')
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(5)

    // ─── 3. Build Telegram message ────────────────────────────────────────────

    const lines: string[] = [`☀️ <b>Morning Brief — ${todayStr}</b>`]

    // Calendar events today
    if (todayEvents.length > 0) {
      lines.push('')
      lines.push(`📅 <b>วันนี้มี ${todayEvents.length} นัด</b>`)
      for (const e of todayEvents) {
        const t = e.start?.dateTime
          ? new Date(e.start.dateTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
          : 'ทั้งวัน'
        const title = e.summary ?? '(ไม่มีชื่อ)'
        const isOnsite = ONSITE_KEYWORDS.some(kw => title.toLowerCase().includes(kw))
        const icon = isOnsite ? '🚗' : '📌'
        lines.push(`${icon} ${t} — ${title}`)
        if (isOnsite) lines.push(`   ⚠️ <b>On-site — เตรียมอุปกรณ์ด้วย</b>`)
      }
    } else {
      lines.push('\n📅 วันนี้ยังไม่มีนัด')
    }

    // Open tickets
    if (openTickets && openTickets.length > 0) {
      lines.push('')
      lines.push(`🎫 <b>Tickets ค้างอยู่ (${openTickets.length})</b>`)
      const priorityEmoji: Record<string, string> = { urgent: '🔥', high: '⚡', normal: '📋', low: '🔵' }
      for (const t of openTickets.slice(0, 3)) {
        const p = priorityEmoji[t.priority] ?? '📋'
        lines.push(`${p} ${t.title.slice(0, 50)}${t.customer_name ? ` (${t.customer_name})` : ''}`)
      }
      if (openTickets.length > 3) lines.push(`   ... และอีก ${openTickets.length - 3} tickets`)
    }

    lines.push('')
    lines.push(`🔗 https://b3-team-avenger.vercel.app/dashboard`)

    const message = lines.join('\n')

    // Only send if there's something notable
    if (todayEvents.length > 0 || (openTickets?.length ?? 0) > 0) {
      const sent = await sendTelegram(message)
      await supabase.from('agent_logs').insert({
        agent_name:  'Janie',
        action_desc: `☀️ Morning Brief: ${todayEvents.length} นัด, ${openTickets?.length ?? 0} tickets`,
        status:      sent ? 'completed' : 'failed',
      })
    }

    return NextResponse.json({
      ok: true,
      eventsToday: todayEvents.length,
      openTickets: openTickets?.length ?? 0,
    })
  } catch (err) {
    console.error('[morning-brief error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
