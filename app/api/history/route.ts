/**
 * GET /api/history
 *
 * ดึงประวัติ conversations พร้อม agent_messages
 * Join path: janie_conversations → agent_tasks → agent_messages
 *
 * Query params:
 *   page  (default 1)
 *   limit (default 20)
 *
 * Returns:
 *   { conversations: [...], total, page, pages }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const from  = (page - 1) * limit
    const to    = from + limit - 1

    // ── 1. Count total conversations ──────────────────────────────────────────
    const { count } = await supabase
      .from('janie_conversations')
      .select('*', { count: 'exact', head: true })

    const total = count ?? 0

    // ── 2. Fetch paginated conversations ─────────────────────────────────────
    const { data: convs, error: convErr } = await supabase
      .from('janie_conversations')
      .select('id, user_message, janie_ack, agents_assigned, status, created_at, summary')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (convErr) throw convErr
    if (!convs?.length) {
      return NextResponse.json({ conversations: [], total, page, pages: Math.ceil(total / limit) })
    }

    const convIds = convs.map(c => c.id as string)

    // ── 3. Fetch tasks for these conversations ────────────────────────────────
    const { data: tasks } = await supabase
      .from('agent_tasks')
      .select('id, conversation_id, assigned_to, task_detail, status')
      .in('conversation_id', convIds)

    const taskIds = (tasks ?? []).map(t => t.id as string)

    // ── 4. Fetch messages for these tasks ─────────────────────────────────────
    const { data: msgs } = taskIds.length > 0
      ? await supabase
          .from('agent_messages')
          .select('id, task_id, agent_id, content, role, created_at')
          .in('task_id', taskIds)
          .eq('role', 'agent')
          .order('created_at', { ascending: true })
      : { data: [] }

    // ── 5. Build conversation_id → messages map (via tasks) ───────────────────
    const taskToConv: Record<string, string> = {}
    for (const t of tasks ?? []) {
      taskToConv[t.id as string] = t.conversation_id as string
    }

    const msgsByConv: Record<string, {
      id: string; agent_id: string; content: string; role: string; created_at: string
    }[]> = {}
    for (const m of msgs ?? []) {
      const convId = taskToConv[m.task_id as string]
      if (!convId) continue
      if (!msgsByConv[convId]) msgsByConv[convId] = []
      msgsByConv[convId].push({
        id:         m.id as string,
        agent_id:   m.agent_id as string,
        content:    m.content as string,
        role:       m.role as string,
        created_at: m.created_at as string,
      })
    }

    // ── 6. Attach tasks + messages to each conversation ───────────────────────
    const tasksByConv: Record<string, typeof tasks> = {}
    for (const t of tasks ?? []) {
      const cid = t.conversation_id as string
      if (!tasksByConv[cid]) tasksByConv[cid] = []
      tasksByConv[cid]!.push(t)
    }

    const conversations = convs.map(c => ({
      ...c,
      tasks:          tasksByConv[c.id as string] ?? [],
      agent_messages: msgsByConv[c.id as string]  ?? [],
    }))

    return NextResponse.json({
      conversations,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
