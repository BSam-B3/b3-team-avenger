/**
 * Workers: process-task
 *
 * POST { task_id } — process a single pending task
 * GET             — process all pending tasks (batch)
 *
 * Flow per task:
 *   1. Load agent context — Supabase DB first, .md file fallback
 *   2. If task is complex → getConsultation() from peer agent
 *   3. If context thin or task needs external info → web search
 *   4. Call AI with context + consultation + search results
 *   5. Save response to agent_messages
 *   6. Mark task as 'done'
 *   7. Update agent_kpi (atomic RPC — no race condition)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAITracked, detectBackend } from '@/lib/ai/client'
import { webSearch, shouldSearch } from '@/lib/ai/search'
import { loadAgentContext } from '@/lib/agents/context'
import { getConsultation } from '@/lib/agents/consult'
import { getEmailContext } from '@/lib/email'

const EMAIL_KEYWORDS = ['email', 'อีเมล', 'mail', 'inbox', 'gmail', 'outlook', 'ส่งเมล', 'เมล', 'สรุปเมล', 'ตรวจเมล']

function needsEmail(taskDetail: string): boolean {
  const lower = taskDetail.toLowerCase()
  return EMAIL_KEYWORDS.some(kw => lower.includes(kw))
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Template fallbacks (used when no AI backend available)
const FALLBACK: Record<string, string> = {
  Janie:  'รับทราบและประสานงานเรียบร้อยแล้วค่ะ จะติดตามความคืบหน้าให้นะคะ',
  Joe:    'รับ task แล้วครับ กำลังออกแบบ architecture จะส่ง technical spec ให้ review ก่อน implement ครับ',
  Enjoy:  'รับงานแล้วค่ะ กำลัง sketch design ก่อน จะส่ง mockup ให้ดูค่ะ',
  Fenton: 'รับทราบครับ จะเตรียม test plan และ acceptance criteria ก่อนเริ่ม QA ครับ',
  Karn:   'รับไว้แล้วครับ กำลังคิด campaign concept จะส่ง brief ให้เร็วๆ นี้ครับ',
  Kitti:  'รับทราบครับ จะตรวจสอบ legal framework และแจ้งความเสี่ยงที่ต้องระวังครับ',
  Nara:   'รับค่ะ กำลัง brainstorm creative concept จะส่งให้ดูค่ะ',
  Metha:  'รับทราบครับ จะทำ financial analysis และ scenario modeling ครับ',
  Pim:    'รับทราบค่ะ จะดำเนินการด้านบัญชีและเอกสารที่เกี่ยวข้องค่ะ',
  Win:    'รับไว้แล้วครับ กำลัง map opportunities และเตรียม approach strategy ครับ',
  Nam:    'รับเรื่องแล้วค่ะ จะดูแลและ follow up จนเสร็จค่ะ',
  Kom:    'รับทราบครับ จะทำ risk assessment และเสนอ mitigation plan ครับ',
  Raps:   'รับค่ะ จะดูแลให้กระบวนการ smooth และ document ไว้ใน knowledge base ค่ะ',
  Ferin:  'รับทราบค่ะ จะเปรียบราคาผู้ขายและทำ comparison table ให้ดูค่ะ',
}

async function generateResponse(
  agentId:    string,
  taskDetail: string,
  taskId:     string,
): Promise<{ reply: string; searchUsed: boolean }> {
  const backend = detectBackend()
  if (backend === 'template') {
    return { reply: FALLBACK[agentId] ?? 'รับทราบแล้ว จะดำเนินการทันที', searchUsed: false }
  }

  try {
    // 1. Load agent context from Supabase (DB-first, file fallback)
    const context = await loadAgentContext(agentId)

    // 2. Peer consultation for complex tasks
    const consultationNote = await getConsultation(agentId, taskDetail, 'deep')

    // 3. Fetch real emails if task involves email
    let emailContext = ''
    if (needsEmail(taskDetail)) {
      emailContext = await getEmailContext(8)
    }

    // 4. Optional web search when context is thin or task explicitly needs external info
    let searchContext = ''
    let searchUsed = false

    if (shouldSearch(context, taskDetail)) {
      const results = await webSearch(taskDetail, 3)
      if (results) {
        searchContext = `\n\n## ข้อมูลจากการค้นหา Web:\n${results}`
        searchUsed = true
      }
    }

    const systemPrompt = `${context}${consultationNote}${emailContext}${searchContext}

Task จาก Janie: "${taskDetail}"

ตอบในฐานะผู้เชี่ยวชาญของคุณ ภาษาไทย กระชับ 2-4 ประโยค:
- ให้ insight / คำแนะนำที่เป็นประโยชน์จริงจากความเชี่ยวชาญของคุณ
- ถ้า task ต้องการข้อมูลเพิ่ม (ตัวเลขจริง, ไฟล์จริง, email จริง) ให้ถามตรงๆ ว่าต้องการอะไร
- ถ้าทำได้เลย ให้ทำและแสดงผลทันที เช่น ทำตาราง, วิเคราะห์, แนะนำ
ห้าม: แต่งตัวเลขเวลา (2 ชั่วโมง, 3 วัน), สัญญา deliverable ที่ไม่มีข้อมูลจริง, พูดซ้ำๆ ว่า "รับทราบแล้วจะดำเนินการ"`

    const reply = await callAITracked(
      {
        system:      systemPrompt,
        userMessage: `Task ที่ได้รับ: ${taskDetail}`,
        maxTokens:   400,
      },
      agentId,
      taskId,
    )

    return { reply, searchUsed }
  } catch {
    return { reply: FALLBACK[agentId] ?? 'รับทราบแล้ว จะดำเนินการทันที', searchUsed: false }
  }
}

// ─── Atomic KPI update via Supabase RPC ──────────────────────────────────────

async function updateKPI(agentId: string, success: boolean) {
  try {
    await supabase.rpc('increment_agent_kpi', {
      p_agent_id: agentId,
      p_success:  success,
    })
  } catch {
    // KPI update is non-critical — ignore
  }
}

// ─── POST: process single task ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { task_id } = await req.json() as { task_id?: string }
    if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 })

    const { data: task, error: taskErr } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('id', task_id)
      .single()

    if (taskErr || !task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    if (task.status !== 'pending') return NextResponse.json({ ok: true, skipped: true })

    // Mark in_progress
    await supabase
      .from('agent_tasks')
      .update({ status: 'in_progress' })
      .eq('id', task_id)

    let success = true

    try {
      const { reply, searchUsed } = await generateResponse(
        task.assigned_to as string,
        task.task_detail as string,
        task_id,
      )

      // Save agent message
      await supabase.from('agent_messages').insert({
        agent_id: task.assigned_to,
        role:     'agent',
        content:  reply,
        task_id,
      })

      // Mark done
      await supabase
        .from('agent_tasks')
        .update({
          status:         'done',
          search_context: searchUsed ? 'web_search_used' : null,
        })
        .eq('id', task_id)

      // Log
      await supabase.from('agent_logs').insert([{
        agent_name:  task.assigned_to,
        action_desc: `✓ task: "${(task.task_detail as string).slice(0, 60)}${(task.task_detail as string).length > 60 ? '...' : ''}"`,
        status:      'completed',
      }])

      // Update conversation search_used flag
      if (searchUsed && task.conversation_id) {
        await supabase
          .from('janie_conversations')
          .update({ search_used: true })
          .eq('id', task.conversation_id)
      }

      return NextResponse.json({
        ok:      true,
        agent:   task.assigned_to,
        reply,
        backend: detectBackend(),
        search:  searchUsed,
      })
    } catch (processingErr) {
      success = false
      await supabase
        .from('agent_tasks')
        .update({ status: 'failed' })
        .eq('id', task_id)
      throw processingErr
    } finally {
      await updateKPI(task.assigned_to as string, success)
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

// ─── GET: batch process all pending ──────────────────────────────────────────

export async function GET() {
  const { data: tasks } = await supabase
    .from('agent_tasks')
    .select('id')
    .eq('status', 'pending')
    .limit(20)

  if (!tasks?.length) return NextResponse.json({ ok: true, processed: 0 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
  const results = await Promise.allSettled(
    tasks.map(t => fetch(`${appUrl}/api/workers/process-task`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ task_id: t.id }),
    }))
  )

  return NextResponse.json({
    ok:        true,
    processed: results.filter(r => r.status === 'fulfilled').length,
  })
}
