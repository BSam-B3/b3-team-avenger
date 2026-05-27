/**
 * POST /api/hr/update-contexts
 *
 * Raps (HR) — อ่าน task ล่าสุด + AI response แล้ว append "lessons learned"
 * ลงใน agent context ผ่าน Supabase (Vercel-safe — ไม่ใช้ filesystem write)
 *
 * เรียกจากหน้า room หลังจาก conversation เสร็จ หรือ manual trigger
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAI, detectBackend } from '@/lib/ai/client'
import { loadAgentContext, saveAgentContext } from '@/lib/agents/context'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { conversation_id } = await req.json() as { conversation_id?: string }

    // Load recent tasks (from specific conversation or last 20 completed)
    let tasksQuery = supabase
      .from('agent_tasks')
      .select('id, assigned_to, task_detail, status')
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(20)

    if (conversation_id) {
      tasksQuery = supabase
        .from('agent_tasks')
        .select('id, assigned_to, task_detail, status')
        .eq('conversation_id', conversation_id)
        .eq('status', 'done')
    }

    const { data: tasks } = await tasksQuery
    if (!tasks?.length) return NextResponse.json({ ok: true, updated: 0 })

    const taskIds = tasks.map(t => t.id as string)
    const { data: msgs } = await supabase
      .from('agent_messages')
      .select('agent_id, content, task_id')
      .in('task_id', taskIds)
      .eq('role', 'agent')

    // Group by agent
    const byAgent = new Map<string, { task: string; response: string }[]>()
    for (const task of tasks) {
      const agentId = task.assigned_to as string
      const msg = msgs?.find(m => m.task_id === task.id)
      if (!msg) continue
      if (!byAgent.has(agentId)) byAgent.set(agentId, [])
      byAgent.get(agentId)!.push({
        task:     task.task_detail as string,
        response: msg.content as string,
      })
    }

    const backend = detectBackend()
    const updated: string[] = []

    for (const [agentId, items] of byAgent.entries()) {
      try {
        // Load current context from Supabase
        const context = await loadAgentContext(agentId)

        // Don't duplicate — check if already updated today
        const today = new Date().toISOString().slice(0, 10)
        if (context.includes(`## Update ${today}`)) continue

        let learning: string

        if (backend !== 'template') {
          const tasksSummary = items
            .map(i => `- Task: ${i.task.slice(0, 100)}\n  Response: ${i.response.slice(0, 200)}`)
            .join('\n')

          learning = await callAI({
            system: `คุณคือ Raps HR & Knowledge Manager ของทีม B3
วิเคราะห์งานที่ ${agentId} เพิ่งทำ แล้วเขียน "lessons learned" สั้นๆ เพื่อ update context
เขียนเป็นภาษาไทย 2-3 bullet points ที่ช่วยให้ ${agentId} ตอบ task คล้ายกันได้ดีขึ้น
ใช้ prefix "- " ทุก bullet พูดถึง pattern หรือ insight ที่พบ
ห้ามพูดซ้ำกับ context ที่มีอยู่แล้ว:
${context.slice(0, 500)}`,
            userMessage: `งานที่ ${agentId} ทำล่าสุด:\n${tasksSummary}\n\nเขียน lessons learned:`,
            maxTokens: 250,
          })
        } else {
          learning = items
            .map(i => `- จัดการ task: "${i.task.slice(0, 60)}"`)
            .join('\n')
        }

        // Append update to context and save to Supabase
        const updatedContext = `${context.trimEnd()}\n\n## Update ${today}\n${learning.trim()}\n`
        await saveAgentContext(agentId, updatedContext, 'Raps')
        updated.push(agentId)
      } catch (err) {
        console.warn(`[HR] failed to update ${agentId}:`, err instanceof Error ? err.message : err)
      }
    }

    // Log Raps' work
    if (updated.length > 0) {
      await supabase.from('agent_logs').insert([{
        agent_name:  'Raps',
        action_desc: `อัพเดต context: ${updated.join(', ')} (${updated.length} คน)`,
        status:      'completed',
      }])
    }

    return NextResponse.json({ ok: true, updated, count: updated.length })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
