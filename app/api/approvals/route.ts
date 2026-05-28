/**
 * GET  /api/approvals          — list pending approvals
 * POST /api/approvals          — create new approval request (called by Exploiter worker)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET() {
  const { data, error } = await supabase
    .from('agent_approvals')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, approvals: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      action_type:   string
      action_detail: string
      risk_level:    string
      nam_summary:   string
      task_id?:      string
    }

    const { data, error } = await supabase
      .from('agent_approvals')
      .insert({
        requested_by:  'Exploiter',
        action_type:   body.action_type,
        action_detail: body.action_detail,
        risk_level:    body.risk_level ?? 'medium',
        nam_summary:   body.nam_summary,
        task_id:       body.task_id ?? null,
        status:        'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // log it
    await supabase.from('agent_logs').insert({
      agent_name:  'Exploiter',
      action_desc: `⚠️ รอ Approve: "${body.action_type}" — ${body.risk_level} risk`,
      status:      'running',
    })

    return NextResponse.json({ ok: true, approval: data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
