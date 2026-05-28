/**
 * GET /api/assets?agent_id=X&limit=100
 * Returns knowledge base entries for ASSETS page
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agent_id')
  const limit   = Math.min(200, parseInt(req.nextUrl.searchParams.get('limit') ?? '100', 10))

  let query = supabase
    .from('agent_knowledge')
    .select('id,agent_id,source,content,chunk_index,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (agentId && agentId !== 'all') query = query.eq('agent_id', agentId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const entries = data ?? []
  const agents  = [...new Set(entries.map((e: { agent_id: string }) => e.agent_id))]
  const sources = [...new Set(entries.map((e: { source: string }) => e.source))]

  return NextResponse.json({
    ok: true,
    entries,
    stats: { total: entries.length, agents: agents.length, sources: sources.length },
  })
}
