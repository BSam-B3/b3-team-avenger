/**
 * GET  /api/b3/memory        — อ่าน B3 profile + ความทรงจำสะสม
 * POST /api/b3/memory        — เพิ่ม/อัปเดต memory ใหม่
 * PATCH /api/b3/memory       — Raps สรุป + condense memory อัตโนมัติ
 *
 * ระบบนี้ทำให้ agents จำ B3 ได้ข้ามการสนทนา และเรียนรู้เพิ่มขึ้นเรื่อยๆ
 * โครงสร้าง:
 *   - b3_profile (core identity — แทบไม่เปลี่ยน)
 *   - b3_memory  (สิ่งที่ Janie/agents เรียนรู้จากการทำงาน)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAITracked } from '@/lib/ai/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// ─── GET: อ่าน B3 profile + memories ─────────────────────────────────────────

export async function GET() {
  const [profileRes, memoriesRes] = await Promise.all([
    supabase.from('app_settings').select('value').eq('key', 'b3_profile').single(),
    supabase.from('app_settings').select('value').eq('key', 'b3_memories').single(),
  ])

  return NextResponse.json({
    ok:       true,
    profile:  profileRes.data?.value ?? null,
    memories: memoriesRes.data?.value ?? [],
  })
}

// ─── POST: agents บันทึก memory ใหม่ ────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { memory, source } = await req.json() as {
    memory: string   // สิ่งที่เรียนรู้
    source: string   // agent ที่บันทึก
  }
  if (!memory) return NextResponse.json({ error: 'memory required' }, { status: 400 })

  // ดึง memories เดิม
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'b3_memories').single()
  const existing: { text: string; source: string; ts: string }[] = data?.value ?? []

  // เพิ่ม memory ใหม่ (เก็บแค่ 50 รายการล่าสุด)
  const updated = [
    { text: memory, source: source ?? 'unknown', ts: new Date().toISOString() },
    ...existing,
  ].slice(0, 50)

  await supabase.from('app_settings').upsert({ key: 'b3_memories', value: updated })

  return NextResponse.json({ ok: true, total: updated.length })
}

// ─── PATCH: Raps condense memories เป็น profile summary ─────────────────────

export async function PATCH() {
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'b3_memories').single()
  const memories: { text: string; source: string; ts: string }[] = data?.value ?? []

  if (memories.length < 5) {
    return NextResponse.json({ ok: true, message: 'not enough memories yet' })
  }

  const memoryText = memories.slice(0, 30).map((m, i) => `${i + 1}. [${m.source}] ${m.text}`).join('\n')

  const summary = await callAITracked({
    system: `คุณคือ Raps HR สรุปสิ่งที่ทีมเรียนรู้เกี่ยวกับ B3 (เจ้านาย)
จาก memory entries ด้านล่าง สรุปเป็น profile summary ภาษาไทย กระชับ
รูปแบบ: bullet points สั้นๆ เน้นข้อมูลที่มีประโยชน์สำหรับการทำงาน`,
    userMessage: memoryText,
    maxTokens: 400,
  }, 'Raps', undefined)

  await supabase.from('app_settings').upsert({
    key:   'b3_learned_profile',
    value: { summary, updated_at: new Date().toISOString(), memory_count: memories.length },
  })

  return NextResponse.json({ ok: true, summary })
}
