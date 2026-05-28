/**
 * POST /api/knowledge/ingest
 * Body: { agent_id, source, content }
 *
 * Splits content into chunks, embeds each, stores in agent_knowledge table.
 * Called by: Chief Data Architect (auto), HR page (manual upload)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { embedText, chunkText } from '@/lib/knowledge/embed'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { agent_id, source, content } = await req.json() as {
      agent_id: string; source: string; content: string
    }
    if (!agent_id || !source || !content) {
      return NextResponse.json({ error: 'agent_id, source, content required' }, { status: 400 })
    }

    // Delete old chunks for this source (re-index)
    await supabase.from('agent_knowledge').delete()
      .eq('agent_id', agent_id).eq('source', source)

    const chunks = chunkText(content, 800, 100)
    const rows: { agent_id: string; source: string; chunk_index: number; content: string; embedding: string }[] = []

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedText(chunks[i])
      rows.push({
        agent_id,
        source,
        chunk_index: i,
        content: chunks[i],
        embedding: `[${embedding.join(',')}]`,
      })
    }

    const { error } = await supabase.from('agent_knowledge').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('agent_logs').insert({
      agent_name:  'Chief',
      action_desc: `📚 indexed "${source}" → ${rows.length} chunks for ${agent_id}`,
      status:      'completed',
    })

    return NextResponse.json({ ok: true, chunks: rows.length, agent_id, source })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

// GET /api/knowledge/ingest — auto-ingest all agent .md files
export async function GET() {
  const AGENT_IDS = ['Janie','Joe','Enjoy','Fenton','Karn','Kitti','Nara','Metha','Pim','Win','Nam','Kom','Raps','Ferin','Exploiter']
  const fs = await import('fs')
  const path = await import('path')

  let total = 0
  const results: { agent: string; chunks: number }[] = []

  for (const agentId of AGENT_IDS) {
    try {
      const filePath = path.join(process.cwd(), 'agent-contexts', `${agentId}.md`)
      const content = fs.readFileSync(filePath, 'utf-8')
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
      const res = await fetch(`${appUrl}/api/knowledge/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, source: `${agentId}.md`, content }),
      })
      const d = await res.json() as { chunks?: number }
      results.push({ agent: agentId, chunks: d.chunks ?? 0 })
      total += d.chunks ?? 0
    } catch { results.push({ agent: agentId, chunks: 0 }) }
  }

  return NextResponse.json({ ok: true, total_chunks: total, results })
}
