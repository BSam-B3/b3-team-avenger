/**
 * POST /api/reflection
 * Body: { agent_id, task_id, successes, mistakes, improvements }
 *
 * Saves reflection log per agent after complex task.
 * Rule of Reflection: ต้องเขียนก่อนรับงานต่อไป (enforced at agent level)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAITracked } from '@/lib/ai/client'
import { loadAgentContext } from '@/lib/agents/context'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// POST — save manual reflection
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    agent_id: string; task_id?: string
    successes?: string; mistakes?: string; improvements?: string
    auto?: boolean; task_detail?: string
  }

  let { successes, mistakes, improvements } = body

  // Auto-generate reflection using AI
  if (body.auto && body.task_detail) {
    const context = await loadAgentContext(body.agent_id)
    const raw = await callAITracked(
      {
        system: `${context}\n\nคุณเพิ่งทำ task นี้เสร็จ: "${body.task_detail}"\n\nเขียน reflection สั้นๆ ในรูปแบบ JSON (ไม่มีข้อความอื่น):\n{"successes":"สิ่งที่ทำได้ดี","mistakes":"จุดที่อาจปรับปรุง","improvements":"วิธีที่ดีกว่าในครั้งหน้า"}`,
        userMessage: body.task_detail,
        maxTokens: 200,
      },
      body.agent_id,
      body.task_id,
    )
    try {
      const m = raw.match(/\{[\s\S]*\}/)
      if (m) {
        const parsed = JSON.parse(m[0]) as { successes: string; mistakes: string; improvements: string }
        successes    = parsed.successes
        mistakes     = parsed.mistakes
        improvements = parsed.improvements
      }
    } catch { /* use empty strings */ }
  }

  const { data, error } = await supabase.from('reflection_logs').insert({
    agent_id:    body.agent_id,
    task_id:     body.task_id ?? null,
    successes:   successes ?? '',
    mistakes:    mistakes ?? '',
    improvements: improvements ?? '',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, reflection: data })
}

// GET — load recent reflections for an agent
export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agent_id')
  const query = supabase.from('reflection_logs').select('*').order('created_at', { ascending: false }).limit(10)
  if (agentId) query.eq('agent_id', agentId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, reflections: data ?? [] })
}
