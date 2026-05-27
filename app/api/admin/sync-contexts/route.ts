/**
 * POST /api/admin/sync-contexts
 *
 * Seed Supabase agent_contexts จาก .md files ทั้งหมด
 * ใช้ครั้งแรก หรือเมื่อต้องการ reset context กลับเป็นค่าตั้งต้นจากไฟล์
 *
 * ปกติ agent context อยู่ใน Supabase แล้ว (Vercel-safe)
 * endpoint นี้ใช้เพื่อ force-sync จาก .md ไฟล์ → DB เท่านั้น
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const AGENT_IDS = [
  'Janie', 'Joe', 'Enjoy', 'Fenton', 'Karn', 'Kitti',
  'Nara', 'Metha', 'Pim', 'Win', 'Nam', 'Kom', 'Raps', 'Ferin',
]

function loadFile(agentId: string): string {
  try {
    return readFileSync(join(process.cwd(), 'agent-contexts', `${agentId}.md`), 'utf-8')
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  // Optional: force-sync specific agents only
  let targets = AGENT_IDS
  try {
    const body = await req.json() as { agents?: string[] }
    if (Array.isArray(body.agents) && body.agents.length > 0) {
      targets = body.agents.filter(a => AGENT_IDS.includes(a))
    }
  } catch {
    // no body — sync all
  }

  const results: { agent: string; status: 'ok' | 'skip' | 'error'; chars?: number }[] = []

  for (const agentId of targets) {
    const content = loadFile(agentId)
    if (!content || content.length < 20) {
      results.push({ agent: agentId, status: 'skip' })
      continue
    }

    const { error } = await supabase.from('agent_contexts').upsert({
      agent_id:   agentId,
      context:    content,
      updated_by: 'sync_admin',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'agent_id' })

    if (error) {
      results.push({ agent: agentId, status: 'error' })
      console.warn(`[sync-contexts] ${agentId} error:`, error.message)
    } else {
      results.push({ agent: agentId, status: 'ok', chars: content.length })
    }
  }

  const ok    = results.filter(r => r.status === 'ok').length
  const skip  = results.filter(r => r.status === 'skip').length
  const error = results.filter(r => r.status === 'error').length

  return NextResponse.json({
    ok: error === 0,
    synced: ok,
    skipped: skip,
    errors: error,
    results,
  })
}

// GET — just show current DB state (no changes)
export async function GET() {
  const { data, error } = await supabase
    .from('agent_contexts')
    .select('agent_id, updated_by, updated_at, char_count:context')
    .order('agent_id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    agents: (data ?? []).map(r => ({
      id:        r.agent_id,
      updatedBy: r.updated_by,
      updatedAt: r.updated_at,
      // char_count is actually the full context string here — just show length
      chars:     typeof r.char_count === 'string' ? r.char_count.length : 0,
    })),
  })
}
