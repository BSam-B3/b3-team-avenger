/**
 * GET  /api/tickets         — list tickets (filter by status/priority)
 * POST /api/tickets         — create new ticket
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  return NextResponse.json({ ok: true, id: data.id })
}
