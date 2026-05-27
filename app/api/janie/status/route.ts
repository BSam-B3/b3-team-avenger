/**
 * GET /api/janie/status?id=<conversation_id>
 *
 * Polling endpoint — client เช็กทุก 2s
 * Returns: conversation + tasks + agent messages + all_done flag
 * Auto-triggers summary when all tasks complete
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Load conversation
  const { data: conv, error: convErr } = await supabase
    .from('janie_conversations')
    .select('id, user_message, janie_ack, agents_assigned, summary, status, created_at')
    .eq('id', id)
    .single()

  if (convErr || !conv) return NextResponse.json({ error: 'conversation not found' }, { status: 404 })

  // Load tasks
  const { data: tasks } = await supabase
    .from('agent_tasks')
    .select('id, assigned_to, task_detail, status')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  // Load agent responses for these tasks
  const taskIds = (tasks ?? []).map(t => t.id as string)
  const agentMessages: Record<string, string> = {}

  if (taskIds.length > 0) {
    const { data: msgs } = await supabase
      .from('agent_messages')
      .select('agent_id, content, task_id')
      .in('task_id', taskIds)
      .eq('role', 'agent')
      .order('created_at', { ascending: true })

    // Last message per agent
    for (const msg of msgs ?? []) {
      agentMessages[msg.agent_id as string] = msg.content as string
    }
  }

  const allDone = tasks != null
    && tasks.length > 0
    && tasks.every(t => t.status === 'done' || t.status === 'failed')

  // Auto-trigger summary when all done and no summary yet
  if (allDone && !conv.summary && conv.status !== 'done') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
    fetch(`${appUrl}/api/janie/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: id }),
    }).catch(() => {})
  }

  // KPI: load per-agent stats
  const { data: kpi } = await supabase
    .from('agent_kpi')
    .select('agent_id, tasks_total, tasks_completed, tasks_failed, last_task_at')
    .in('agent_id', conv.agents_assigned ?? [])

  return NextResponse.json({
    conversation:   conv,
    tasks:          tasks ?? [],
    agent_messages: agentMessages,
    all_done:       allDone,
    kpi:            kpi ?? [],
  })
}
