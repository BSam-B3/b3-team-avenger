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
import { getEmailContext, detectEmailScope } from '@/lib/email'
import { detectCustomerInfo, proposeCustomerUpdates } from '@/lib/customers/learn'

const EMAIL_KEYWORDS     = ['email', 'อีเมล', 'mail', 'inbox', 'gmail', 'outlook', 'ส่งเมล', 'เมล', 'สรุปเมล', 'ตรวจเมล', 'pandv', 'cit']
const EXPLOITER_KEYWORDS = ['เข้าถึง', 'remote', 'ssh', 'server', 'script', 'สแกน', 'scan', 'เครื่อง', 'network', 'ติดตั้ง', 'install', 'agent', 'shortcut', 'ทางลัด', 'exploit', 'automate', 'อัตโนมัติ', 'rdp', 'vpn']

function needsEmail(taskDetail: string): boolean {
  const lower = taskDetail.toLowerCase()
  return EMAIL_KEYWORDS.some(kw => lower.includes(kw))
}

function isExploiterTask(taskDetail: string): boolean {
  const lower = taskDetail.toLowerCase()
  return EXPLOITER_KEYWORDS.some(kw => lower.includes(kw))
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
  Ferin:    'รับทราบค่ะ จะเปรียบราคาผู้ขายและทำ comparison table ให้ดูค่ะ',
  Exploiter: '⚠️ รับ task แล้วครับ กำลังวิเคราะห์และสร้าง Approval Request รอยืนยันจากคุณบีสามก่อนดำเนินการ',
  Chief:     'รับทราบครับ กำลังตรวจสอบโครงสร้างข้อมูลและจัดการ Knowledge Base',
  Finley:    'รับทราบค่ะ กำลังตรวจสอบข้อมูลค่าใช้จ่ายและจะรายงานให้ทราบค่ะ',
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
    // 1. Load agent context — LEVEL 1 + LEVEL 3 RAG
    const context = await loadAgentContext(agentId, taskDetail)

    // 2. Peer consultation for complex tasks
    const consultationNote = await getConsultation(agentId, taskDetail, 'deep')

    // 3. Fetch real emails — smart scope: default=work (PANDV+CIT), explicit=gmail/cit/pandv
    let emailContext = ''
    if (needsEmail(taskDetail)) {
      const scope = detectEmailScope(taskDetail)
      emailContext = await getEmailContext(6, scope)
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

    // Calendar: Janie creates event directly via Google Calendar API
    const CALENDAR_KEYWORDS = ['นัด', 'ตาราง', 'calendar', 'schedule', 'นัดหมาย', 'on-site', 'ออนไซท์', 'กำหนดการ']
    if (agentId === 'Janie' && CALENDAR_KEYWORDS.some(kw => taskDetail.toLowerCase().includes(kw))) {
      const appUrlCal = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'

      // Check if calendar is connected
      const calStatus = await fetch(`${appUrlCal}/api/calendar`).then(r => r.json()).catch(() => ({ connected: false }))

      if (calStatus.connected) {
        // AI parses natural language → structured event
        const parsePrompt = `แปลงคำสั่งนัดหมายต่อไปนี้เป็น JSON เท่านั้น (ไม่มีข้อความอื่น):
{
  "summary": "ชื่อนัด",
  "startTime": "ISO8601 datetime (Asia/Bangkok) เช่น 2026-05-29T10:00:00+07:00",
  "endTime": "ISO8601 datetime (Asia/Bangkok) เช่น 2026-05-29T11:00:00+07:00",
  "description": "รายละเอียด (ถ้ามี)",
  "recurrence": "RRULE string (ถ้าเป็น recurring) หรือ null",
  "remindMinutes": 60
}

วันนี้: ${new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
พรุ่งนี้: ${new Date(Date.now() + 86400000).toISOString().slice(0,10)}`

        const parsed = await callAITracked(
          { system: parsePrompt, userMessage: taskDetail, maxTokens: 200 },
          'Janie', taskId,
        )
        try {
          const m = parsed.match(/\{[\s\S]*\}/)
          if (m) {
            const evt = JSON.parse(m[0]) as {
              summary: string; startTime: string; endTime: string
              description?: string; recurrence?: string; remindMinutes?: number
            }
            const created = await fetch(`${appUrlCal}/api/calendar`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify(evt),
            }).then(r => r.json())

            if (created.ok) {
              return {
                reply: `✅ สร้างนัด "${evt.summary}" ใน Google Calendar แล้วค่ะ — sync มือถือได้เลย 📅${created.htmlLink ? `\n🔗 ${created.htmlLink}` : ''}`,
                searchUsed: false,
              }
            }
          }
        } catch { /* fall through to normal reply */ }
      } else {
        return {
          reply: `📅 ยังไม่ได้เชื่อมต่อ Google Calendar ค่ะ\nกรุณาไปที่ **/settings** แล้วกด **"เชื่อมต่อ Google Calendar"** ก่อนนะคะ`,
          searchUsed: false,
        }
      }
    }

    // Exploiter: generate approval request instead of direct response
    if (agentId === 'Exploiter' && isExploiterTask(taskDetail)) {
      const exploiterPrompt = `${context}

Task: "${taskDetail}"

วิเคราะห์ task นี้และสร้าง Approval Request ในรูปแบบ JSON เท่านั้น (ไม่มีข้อความอื่น):
{
  "action_type": "ประเภทงาน เช่น remote_access / script_run / system_scan",
  "action_detail": "อธิบายละเอียดว่าจะทำอะไร บนระบบไหน",
  "risk_level": "low หรือ medium หรือ high หรือ critical",
  "nam_summary": "สรุปภาษาไทยสั้นๆ สำหรับคุณบีสามอ่าน — Exploiter ต้องการทำอะไร เพราะอะไร ได้ประโยชน์อะไร",
  "agent_reply": "ข้อความตอบกลับสั้นๆ ในฐานะ Exploiter ว่ากำลังรอ Approve อยู่"
}`

      const raw = await callAITracked(
        { system: exploiterPrompt, userMessage: taskDetail, maxTokens: 300 },
        agentId, taskId,
      )

      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as {
            action_type: string; action_detail: string
            risk_level: string; nam_summary: string; agent_reply: string
          }
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
          await fetch(`${appUrl}/api/approvals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action_type:   parsed.action_type,
              action_detail: parsed.action_detail,
              risk_level:    parsed.risk_level,
              nam_summary:   parsed.nam_summary,
              task_id:       taskId,
            }),
          })
          return { reply: parsed.agent_reply || `⏳ กำลังรอ Approve จากคุณบีสามก่อนดำเนินการ task นี้ครับ`, searchUsed: false }
        }
      } catch { /* fall through to normal reply */ }
    }

    const systemPrompt = `${context}${consultationNote}${emailContext}${searchContext}

Task จาก Janie: "${taskDetail}"

ตอบในฐานะผู้เชี่ยวชาญของคุณ ภาษาไทย กระชับ 2-4 ประโยค:
- ให้ insight / คำแนะนำที่เป็นประโยชน์จริงจากความเชี่ยวชาญของคุณ
- ถ้า task ต้องการข้อมูลเพิ่ม (ตัวเลขจริง, ไฟล์จริง, email จริง) ให้ถามตรงๆ ว่าต้องการอะไร
- ถ้าทำได้เลย ให้ทำและแสดงผลทันที เช่น ทำตาราง, วิเคราะห์, แนะนำ
- ถ้าเรียนรู้อะไรใหม่เกี่ยวกับ B3/เจ้านาย จากการทำ task นี้ ให้ต่อท้ายด้วย [LEARN: สิ่งที่เรียนรู้]
ห้าม: แต่งตัวเลขเวลา (2 ชั่วโมง, 3 วัน), สัญญา deliverable ที่ไม่มีข้อมูลจริง, พูดซ้ำๆ ว่า "รับทราบแล้วจะดำเนินการ"`

    const rawReply = await callAITracked(
      {
        system:      systemPrompt,
        userMessage: `Task ที่ได้รับ: ${taskDetail}`,
        maxTokens:   450,
      },
      agentId,
      taskId,
    )

    // Extract [LEARN: ...] tag and save to B3 memory (non-blocking)
    const learnMatch = rawReply.match(/\[LEARN:\s*([\s\S]+?)\]/)
    const reply = rawReply.replace(/\[LEARN:[^\]]*\]/g, '').trim()
    const appUrl3 = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'

    if (learnMatch?.[1]) {
      void fetch(`${appUrl3}/api/b3/memory`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ memory: learnMatch[1].trim(), source: agentId }),
      }).catch(() => {})
    }

    // Customer intelligence — detect + propose updates from task+reply (non-blocking)
    void (async () => {
      try {
        const combined = `[Task] ${taskDetail}\n[Response] ${reply}`
        const proposals = await detectCustomerInfo(combined, agentId)
        if (proposals.length > 0) {
          await proposeCustomerUpdates(proposals, agentId, combined, appUrl3)
        }
      } catch { /* non-critical */ }
    })()

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

      // Auto-generate reflection for complex tasks (non-blocking)
      const appUrl2 = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
      void fetch(`${appUrl2}/api/reflection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id:    task.assigned_to,
          task_id:     task_id,
          auto:        true,
          task_detail: task.task_detail,
        }),
      }).catch(() => {})

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
