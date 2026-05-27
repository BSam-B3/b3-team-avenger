/**
 * GET /api/history
 *
 * ดึงประวัติ conversations พร้อม agent_messages
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
    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const from  = (page - 1) * limit
    const to    = from + limit - 1

    // ── 1. Count total conversations ──────────────────────────────────────────
    const { count, error: countErr } = await supabase
      .from('janie_conversations')
      .select('*', { count: 'exact', head: true })

    if (countErr) throw countErr

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

    // ── 3. Fetch agent_messages for these conversations ───────────────────────
    const convIds = convs.map(c => c.id as string)

    const { data: msgs, error: msgErr } = await supabase
      .from('agent_messages')
      .select('id, conversation_id, agent_id, content, role, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: true })

    if (msgErr) throw msgErr

    // ── 4. Group messages by conversation ─────────────────────────────────────
    const msgsByConv: Record<string, typeof msgs> = {}
    for (const m of msgs ?? []) {
      const cid = m.conversation_id as string
      if (!msgsByConv[cid]) msgsByConv[cid] = []
      msgsByConv[cid].push(m)
    }

    const conversations = convs.map(c => ({
      ...c,
      agent_messages: msgsByConv[c.id as string] ?? [],
    }))

    return NextResponse.json({
      conversations,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
