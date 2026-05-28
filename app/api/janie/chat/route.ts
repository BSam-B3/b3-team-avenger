/**
 * POST /api/janie/chat
 *
 * จุดเริ่มต้นทุกคำสั่งจาก B3 → Janie
 *
 * Flow:
 *   1. รับ message จาก B3
 *   2. Janie AI วิเคราะห์ → กำหนด agent + task
 *   3. สร้าง janie_conversations record
 *   4. สร้าง agent_tasks linked to conversation
 *   5. Fire workers แบบ non-blocking
 *   6. Return conversation_id + Janie's ack ทันที
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAIForJSON, detectBackend } from '@/lib/ai/client'
import { loadAgentContext } from '@/lib/agents/context'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const TEAM_ROSTER = `
ทีม B3 Team Avenger — 14 คน:
- Janie  : AI Orchestrator, เลขาและผู้ประสานงาน (ตอบแทน B3 ได้)
- Joe    : Backend & Infrastructure Architect
- Enjoy  : Frontend Engineer & UI Designer
- Fenton : Quality Officer & Code Reviewer
- Karn   : Community & Local Marketing Lead
- Kitti  : Head of Legal & Corporate Compliance
- Nara   : Creative Director & Social Media Manager
- Metha  : CFO & Financial Architect
- Pim    : Head of Accounting & Taxation
- Win    : VP Business Development & Local Alliances
- Nam    : Head of Customer Support & Mediator
- Kom    : Chief Risk Officer & Devil's Advocate
- Raps   : Chief HR Officer & Knowledge Manager
- Ferin  : Chief Procurement Officer & Vendor Analyst
`.trim()

interface ParsedTask { assigned_to: string; task_detail: string }
interface OrchestrateResult { ack: string; tasks: ParsedTask[] }

async function janieDelegates(msg: string): Promise<OrchestrateResult> {
  const janieCtx = await loadAgentContext('Janie')

  const system = `${janieCtx}

${TEAM_ROSTER}

วิเคราะห์ directive แล้วตอบด้วย JSON object นี้เท่านั้น — ห้ามมีข้อความอื่น ห้าม markdown:
{
  "ack": "ข้อความตอบรับ 1-2 ประโยค บอก B3 ว่าจะส่งงานให้ใครทำอะไร",
  "tasks": [
    { "assigned_to": "ชื่อAgent", "task_detail": "งาน actionable ชัดเจน ภาษาไทย" }
  ]
}
กฎ:
- tasks: เลือก 1-4 agent ที่เหมาะสมที่สุด ห้าม assign ซ้ำซ้อน
- task_detail: ระบุสิ่งที่ agent ต้องวิเคราะห์หรือแนะนำ พร้อมบริบทจาก directive
- ถ้าเป็นแชทธรรมดา / ถามสถานะ → assigned_to: Janie
- ถ้า task ต้องการข้อมูลภายนอก (อ่าน email, ดูไฟล์) แต่ไม่มีข้อมูลนั้น → task_detail ให้บอกว่า "B3 ต้องการ [อะไร] กรุณาวางข้อมูลนั้นมาเพื่อดำเนินการต่อ"
- email/อีเมล → Nam, จัดซื้อ/vendor → Ferin, finance/งบ → Metha, legal → Kitti`

  const fallback: OrchestrateResult = {
    ack: 'รับทราบค่ะ จะดำเนินการทันที',
    tasks: [{ assigned_to: 'Janie', task_detail: msg }],
  }

  const result = await callAIForJSON<OrchestrateResult>(
    { system, userMessage: msg, maxTokens: 700 },
    fallback
  )

  return {
    ack:   typeof result.ack === 'string' ? result.ack : fallback.ack,
    tasks: Array.isArray(result.tasks) && result.tasks.length > 0
      ? result.tasks.slice(0, 4).filter(t => t.assigned_to && t.task_detail)
      : fallback.tasks,
  }
}

function janieRuleBased(msg: string): OrchestrateResult {
  const lower = msg.toLowerCase()
  const found = new Map<string, string>()

  const KEYWORDS: [string[], string][] = [
    [['frontend', 'ui', 'ux', 'design', 'หน้า', 'ดีไซน์', 'component'], 'Enjoy'],
    [['backend', 'api', 'database', 'server', 'ระบบ', 'ฐานข้อมูล'], 'Joe'],
    [['review', 'code', 'test', 'quality', 'ทดสอบ', 'bug'], 'Fenton'],
    [['marketing', 'community', 'campaign', 'การตลาด', 'แคมเปญ'], 'Karn'],
    [['legal', 'contract', 'compliance', 'กฎหมาย', 'สัญญา'], 'Kitti'],
    [['content', 'social', 'creative', 'โพสต์', 'คอนเทนต์'], 'Nara'],
    [['finance', 'budget', 'financial', 'งบ', 'การเงิน'], 'Metha'],
    [['accounting', 'invoice', 'tax', 'บัญชี', 'ภาษี'], 'Pim'],
    [['business', 'partner', 'deal', 'ธุรกิจ', 'พาร์ทเนอร์'], 'Win'],
    [['support', 'customer', 'ลูกค้า', 'ช่วยเหลือ'], 'Nam'],
    [['risk', 'security', 'audit', 'ความเสี่ยง'], 'Kom'],
    [['hr', 'hire', 'onboard', 'knowledge', 'พนักงาน'], 'Raps'],
    [['procurement', 'vendor', 'จัดซื้อ', 'ราคา', 'เปรียบราคา', 'ผู้ขาย', 'supplier', 'po', 'price'], 'Ferin'],
    [['email', 'อีเมล', 'mail', 'inbox', 'gmail', 'ส่งเมล', 'เมล'], 'Nam'],
    [['exploit', 'shortcut', 'ทางลัด', 'remote', 'ssh', 'rdp', 'สแกน network', 'เข้าถึงเครื่อง', 'ฝัง agent', 'automate', 'อัตโนมัติ'], 'Exploiter'],
    [['ค่าใช้จ่าย', 'บิล', 'bill', 'ค่าไฟ', 'ค่าน้ำ', 'subscription', 'payment', 'ชำระ', 'api cost', 'vercel cost', 'finley'], 'Finley'],
    [['knowledge base', 'vector', 'index', 'condense', 'ข้อมูลซ้ำ', 'chief', 'data architect'], 'Chief'],
  ]

  for (const [keywords, agent] of KEYWORDS) {
    if (keywords.some(kw => lower.includes(kw))) found.set(agent, msg)
  }

  if (found.size === 0) {
    return { ack: 'รับทราบค่ะ จะดำเนินการทันที', tasks: [{ assigned_to: 'Janie', task_detail: msg }] }
  }

  const agents = Array.from(found.keys())
  return {
    ack: `รับทราบค่ะ จะส่งงานให้ ${agents.join(' และ ')} ดำเนินการทันทีค่ะ`,
    tasks: Array.from(found.entries()).map(([assigned_to, task_detail]) => ({ assigned_to, task_detail })),
  }
}

function triggerWorkers(taskIds: string[]) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
  for (const task_id of taskIds) {
    fetch(`${appUrl}/api/workers/process-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id }),
    }).catch(() => {})
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json() as { message?: string }
    if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

    const msg = message.trim().slice(0, 2000)
    const backend = detectBackend()

    // Step 1: Janie decides routing
    const { ack, tasks } = backend !== 'template'
      ? await janieDelegates(msg)
      : janieRuleBased(msg)

    const agents = [...new Set(tasks.map(t => t.assigned_to))]

    // Step 2: Create conversation record
    const { data: conv, error: convErr } = await supabase
      .from('janie_conversations')
      .insert({ user_message: msg, janie_ack: ack, agents_assigned: agents, status: 'processing' })
      .select('id')
      .single()

    if (convErr || !conv) throw convErr ?? new Error('failed to create conversation')

    // Step 3: Create agent tasks linked to conversation
    const { data: inserted, error: tasksErr } = await supabase
      .from('agent_tasks')
      .insert(tasks.map(t => ({ ...t, status: 'pending', conversation_id: conv.id })))
      .select('id, assigned_to')

    if (tasksErr) throw tasksErr

    const taskIds = (inserted ?? []).map(t => t.id as string)

    // Step 4: Log
    await supabase.from('agent_logs').insert([{
      agent_name:  'Janie',
      action_desc: `[conv:${conv.id.slice(0, 8)}] route → ${agents.join(', ')}`,
      status:      'completed',
    }])

    // Step 5: Fire workers non-blocking
    if (taskIds.length > 0) triggerWorkers(taskIds)

    return NextResponse.json({
      ok:              true,
      conversation_id: conv.id,
      janie_ack:       ack,
      agents_assigned: agents,
      task_count:      taskIds.length,
      backend,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
