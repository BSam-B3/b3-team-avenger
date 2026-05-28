/**
 * GET  /api/agents/context?agent_id=X  — load agent context (DB first, .md fallback)
 * POST /api/agents/context             — save/update agent context to DB
 *
 * NOTE: agent_contexts table uses column name "context" (not context_text)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agent_id')
  if (!agentId) return NextResponse.json({ error: 'agent_id required' }, { status: 400 })

  // 1. Try Supabase DB
  const { data } = await supabase
    .from('agent_contexts')
    .select('agent_id, context, updated_at')
    .eq('agent_id', agentId)
    .single()

  if (data) {
    return NextResponse.json({
      ok: true,
      context: { agent_id: data.agent_id, context_text: data.context, updated_at: data.updated_at },
      source: 'db',
    })
  }

  // 2. Fallback to .md file
  try {
    const filePath = path.join(process.cwd(), 'agent-contexts', `${agentId}.md`)
    const text = fs.readFileSync(filePath, 'utf-8')
    return NextResponse.json({
      ok: true,
      context: { agent_id: agentId, context_text: text, updated_at: null },
      source: 'file',
    })
  } catch {
    return NextResponse.json({ ok: true, context: null })
  }
}

export async function POST(req: NextRequest) {
  const { agent_id, context_text } = await req.json() as { agent_id: string; context_text: string }
  if (!agent_id || !context_text) {
    return NextResponse.json({ error: 'agent_id and context_text required' }, { status: 400 })
  }

  // Save using actual column name "context"
  const { error } = await supabase
    .from('agent_contexts')
    .upsert(
      { agent_id, context: context_text, updated_by: 'team_page', updated_at: new Date().toISOString() },
      { onConflict: 'agent_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('agent_logs').insert({
    agent_name:  agent_id,
    action_desc: '📝 context updated from Team page',
    status:      'completed',
  })

  return NextResponse.json({ ok: true })
}
