/**
 * POST /api/janie/summary
 * Body: { conversation_id: string }
 *
 * Janie synthesizes all agent responses → สรุปให้ B3
 * Called automatically by /api/janie/status when all tasks done
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAI, detectBackend } from '@/lib/ai/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { conversation_id } = await req.json() as { conversation_id?: string }
    if (!conversation_id) return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })

    // Load conversation
    const { data: conv, error: convErr } = await supabase
      .from('janie_conversations')
      .select('*')
      .eq('id', conversation_id)
      .single()

    if (convErr || !conv) return NextResponse.json({ error: 'not found' }, { status: 404 })

    // Already summarized
    if (conv.summary) return NextResponse.json({ ok: true, summary: conv.summary, cached: true })

    // Mark as summarizing (prevent duplicate calls)
    await supabase
      .from('janie_conversations')
      .update({ status: 'summarizing' })
      .eq('id', conversation_id)
      .eq('status', 'processing')  // only if still processing

    // Load tasks + agent messages
    const { data: tasks } = await supabase
      .from('agent_tasks')
      .select('id, assigned_to, task_detail, status')
      .eq('conversation_id', conversation_id)

    const taskIds = (tasks ?? []).map(t => t.id as string)
    let agentReports = ''

    if (taskIds.length > 0) {
      const { data: msgs } = await supabase
        .from('agent_messages')
        .select('agent_id, content, created_at')
        .in('task_id', taskIds)
        .eq('role', 'agent')
        .order('created_at', { ascending: true })

      if (msgs && msgs.length > 0) {
        agentReports = msgs
          .map(m => `**${m.agent_id}:** ${(m.content as string).slice(0, 500)}`)
          .join('\n\n')
      }
    }

    // Generate Janie's summary
    let summary: string

    if (detectBackend() !== 'template' && agentReports) {
      try {
        summary = await callAI({
          system: `คุณคือ Janie AI Orchestrator ของทีม B3 Team Avenger
หน้าที่ตอนนี้: สรุปผลการทำงานของทีมให้ B3 (คุณบีสาม) เข้าใจง่ายและครบถ้วน

กฎการสรุป:
- เริ่มด้วย "ค่ะ คุณบีสาม รายงานผลการดำเนินงาน:"
- สรุปแต่ละ agent ทำอะไร ได้ผลอะไร 1-2 ประโยค/คน
- จบด้วย next steps ที่ B3 ควรทำต่อ (ถ้ามี)
- ภาษาไทย กระชับ มืออาชีพ ไม่เกิน 200 คำ`,
          userMessage: `คำสั่งเดิมของ B3: "${conv.user_message as string}"

รายงานจากทีม:
${agentReports}

กรุณาสรุปให้ B3:`,
          maxTokens: 500,
        })
      } catch {
        summary = agentReports
          ? `ค่ะ คุณบีสาม ทีมได้รับและดำเนินการ task แล้วค่ะ:\n\n${agentReports}`
          : 'รับทราบค่ะ ทีมได้รับ task แล้ว กำลังดำเนินการค่ะ'
      }
    } else {
      summary = agentReports
        ? `ค่ะ คุณบีสาม ทีมได้รับและดำเนินการ task แล้วค่ะ:\n\n${agentReports}`
        : 'รับทราบค่ะ ทีมได้รับ task แล้ว กำลังดำเนินการค่ะ'
    }

    // Save summary
    await supabase
      .from('janie_conversations')
      .update({ summary, status: 'done', updated_at: new Date().toISOString() })
      .eq('id', conversation_id)

    await supabase.from('agent_logs').insert([{
      agent_name:  'Janie',
      action_desc: `สรุปผล conversation ${conversation_id.slice(0, 8)}`,
      status:      'completed',
    }])

    return NextResponse.json({ ok: true, summary })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
