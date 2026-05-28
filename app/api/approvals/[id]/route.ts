/**
 * PATCH /api/approvals/[id]  — approve or reject a pending request
 * Body: { action: 'approve' | 'reject' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { action } = await req.json() as { action: 'approve' | 'reject' }

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('agent_approvals')
    .update({
      status:      action === 'approve' ? 'approved' : 'rejected',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'not found or already resolved' }, { status: 404 })

  const icon   = action === 'approve' ? '✅' : '❌'
  const label  = action === 'approve' ? 'approved' : 'rejected'

  await supabase.from('agent_logs').insert({
    agent_name:  'Exploiter',
    action_desc: `${icon} คุณบีสาม ${label}: "${(data.action_type as string).slice(0, 50)}"`,
    status:      action === 'approve' ? 'completed' : 'failed',
  })

  return NextResponse.json({ ok: true, approval: data })
}
