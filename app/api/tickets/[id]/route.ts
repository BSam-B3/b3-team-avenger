/**
 * GET   /api/tickets/[id]   — ticket detail
 * PATCH /api/tickets/[id]   — update status / resolution
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase.from('support_tickets').select('*').eq('id', id).single()
  if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ ok: true, ticket: data })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as { status?: string; resolution?: string; assigned_to?: string; priority?: string }

  const updates: Record<string, unknown> = { ...body }
  if (body.status === 'resolved' || body.status === 'closed') {
    updates.resolved_at = new Date().toISOString()
  }

  const { error } = await supabase.from('support_tickets').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.status) {
    await supabase.from('agent_logs').insert({
      agent_name:  'Nam',
      action_desc: `🎫 ticket ${id.slice(0,8)}: status → ${body.status}`,
      status:      'completed',
    })
  }

  return NextResponse.json({ ok: true })
}
