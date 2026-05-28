/**
 * GET  /api/tickets         — list tickets (filter by status/priority)
 * POST /api/tickets         — create new ticket
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/notify/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: NextRequest) {
  const status   = req.nextUrl.searchParams.get('status')
  const priority = req.nextUrl.searchParams.get('priority')

  let query = supabase
    .from('support_tickets')
    .select('id,title,customer_name,status,priority,category,assigned_to,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (status && status !== 'all') query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts = await Promise.all(['open','in_progress','resolved','closed'].map(async s => {
    const { count } = await supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', s)
    return [s, count ?? 0] as const
  }))

  return NextResponse.json({
    ok: true,
    tickets: data ?? [],
    counts: Object.fromEntries(counts),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    title: string; description?: string; customer_name?: string
    customer_id?: string; priority?: string; category?: string; source?: string
  }
  if (!body.title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      title:         body.title,
      description:   body.description ?? '',
      customer_name: body.customer_name ?? '',
      customer_id:   body.customer_id ?? null,
      priority:      body.priority ?? 'normal',
      category:      body.category ?? 'general',
      source:        body.source ?? 'manual',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('agent_logs').insert({
    agent_name:  'Nam',
    action_desc: `🎫 ticket opened: "${body.title.slice(0, 60)}"`,
    status:      'completed',
  })

  // Telegram alert for new tickets (especially from customer /support form)
  const source = body.source ?? 'manual'
  const priorityEmoji: Record<string, string> = { urgent: '🔥', high: '⚡', normal: '📋', low: '🔵' }
  const pEmoji = priorityEmoji[body.priority ?? 'normal'] ?? '📋'
  const fromLabel = source === 'customer' ? '👤 ลูกค้าส่งมาจาก /support' : source === 'janie' ? '🤖 Janie สร้างให้' : '✍️ สร้างด้วยมือ'

  void sendTelegram(
    `🎫 <b>Ticket ใหม่</b>\n` +
    `${pEmoji} ${body.title}\n` +
    (body.customer_name ? `👤 ${body.customer_name}\n` : '') +
    `📂 ${body.category ?? 'general'} | ${fromLabel}\n` +
    `🔗 https://b3-team-avenger.vercel.app/tickets`
  )

  // Auto-link to existing customer by name
  if (body.customer_name && !body.customer_id) {
    const { data: found } = await supabase
      .from('customers')
      .select('id')
      .ilike('name', `%${body.customer_name}%`)
      .limit(1)
      .single()
    if (found) {
      await supabase.from('support_tickets').update({ customer_id: found.id }).eq('id', data.id)
    }
  }

  return NextResponse.json({ ok: true, id: data.id })
}
