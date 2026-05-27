import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAIForJSON, callAI, detectBackend } from '@/lib/ai/client'
import { loadAgentContext } from '@/lib/agents/context'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const AGENTS_CONTEXT = `
ทีม B3 Team Avenger มีสมาชิก 14 คน:
- Janie: AI Orchestrator — รับคำสั่งและกระจายงาน
- Enjoy: Frontend Engineer & UI Designer — งาน UI, component, design
- Joe: Backend & Infrastructure Architect — งาน API, database, server
- Fenton: Quality Officer & Code Reviewer — review code, testing, QA
- Karn: Community Engagement & Local Marketing Lead — การตลาด, community
- Kitti: Head of Legal & Corporate Compliance — กฎหมาย, สัญญา, compliance
- Nara: Creative Director & Social Media Manager — content, social media, creative
- Metha: CFO & Financial Architect — การเงิน, budget, financial planning
- Pim: Head of Accounting & Taxation — บัญชี, ภาษี, invoice
- Win: VP Business Development & Local Alliances — ธุรกิจ, partnerships, deals
- Nam: Head of Customer Support & Mediator — support ลูกค้า, แก้ปัญหา
- Kom: Chief Risk Officer & Devil's Advocate — ความเสี่ยง, security, audit
- Raps: Chief HR Officer & Knowledge Manager — HR, onboarding, knowledge base
- Ferin: Chief Procurement Officer & Vendor Analyst — จัดซื้อ, เปรียบราคา, vendor
`.trim()

interface ParsedTask { assigned_to: string; task_detail: string }

async function janieAI(directive: string): Promise<ParsedTask[]> {
  const janieCtx = await loadAgentContext('Janie')
  const system = `คุณคือ Janie AI Orchestrator ของทีม B3 Team Avenger
${AGENTS_CONTEXT}

กฎการตอบ:
- ตอบด้วย JSON array เท่านั้น ไม่มีข้อความอื่นเลย ไม่มี markdown ไม่มี \`\`\`
- format: [{"assigned_to":"ชื่อ","task_detail":"งาน"}]
- assign เฉพาะ agent ที่เหมาะสม 1-4 คน
- task_detail เป็นภาษาไทย ชัดเจน actionable
- ถ้าไม่แน่ใจ assign ให้ Janie`

  const userMsg = `วิเคราะห์ directive นี้แล้วตอบด้วย JSON array เท่านั้น:\n"${directive}"\n\nJSON:`

  return callAIForJSON<ParsedTask[]>(
    { system, userMessage: userMsg, maxTokens: 512 },
    [{ assigned_to: 'Janie', task_detail: directive }]
  ).then(r => (Array.isArray(r) ? r.slice(0, 4) : [{ assigned_to: 'Janie', task_detail: directive }]))
}

function janieRuleBased(directive: string): ParsedTask[] {
  const lower = directive.toLowerCase()
  const found = new Map<string, string>()

  const KEYWORDS: [string[], string][] = [
    [['frontend', 'ui', 'design', 'component', 'page', 'จิง', 'jing', 'หน้า', 'ดีไซน์'], 'Enjoy'],
    [['backend', 'api', 'database', 'server', 'infra', 'joe', 'โจ', 'ระบบ', 'ฐานข้อมูล'], 'Joe'],
    [['review', 'code review', 'test', 'quality', 'fenton', 'เฟนตัน', 'ทดสอบ'], 'Fenton'],
    [['marketing', 'community', 'karn', 'กานต์', 'การตลาด', 'แคมเปญ'], 'Karn'],
    [['legal', 'contract', 'compliance', 'kitti', 'กิตติ', 'กฎหมาย', 'สัญญา'], 'Kitti'],
    [['content', 'social', 'creative', 'nara', 'นารา', 'โพสต์', 'คอนเทนต์'], 'Nara'],
    [['finance', 'budget', 'financial', 'metha', 'เมธา', 'งบ', 'การเงิน'], 'Metha'],
    [['accounting', 'invoice', 'tax', 'pim', 'พิม', 'บัญชี', 'ภาษี'], 'Pim'],
    [['business', 'partner', 'deal', 'win', 'วิน', 'ธุรกิจ', 'พาร์ทเนอร์'], 'Win'],
    [['support', 'customer', 'nam', 'น้ำ', 'ลูกค้า', 'ช่วยเหลือ'], 'Nam'],
    [['risk', 'security', 'audit', 'kom', 'คมน์', 'ความเสี่ยง'], 'Kom'],
    [['hr', 'hire', 'onboard', 'knowledge', 'raps', 'แรปส์', 'พนักงาน'], 'Raps'],
    [['procurement', 'vendor', 'ferin', 'เฟริน', 'จัดซื้อ', 'ราคา', 'เปรียบราคา', 'ผู้ขาย', 'supplier'], 'Ferin'],
  ]

  for (const [keywords, agent] of KEYWORDS) {
    if (keywords.some(kw => lower.includes(kw))) found.set(agent, directive)
  }

  if (found.size === 0) return [{ assigned_to: 'Janie', task_detail: directive }]
  return Array.from(found.entries()).map(([assigned_to, task_detail]) => ({ assigned_to, task_detail }))
}

// Fire-and-forget: trigger worker for each task (non-blocking)
function triggerWorkers(taskIds: string[]) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
  for (const task_id of taskIds) {
    fetch(`${appUrl}/api/workers/process-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id }),
    }).catch(() => { /* silent — worker runs async */ })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { directive, api_key } = body as { directive?: string; api_key?: string }

    const requiredKey = process.env.AGENT_BRIDGE_API_KEY
    if (requiredKey && api_key !== requiredKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!directive?.trim()) {
      return NextResponse.json({ error: 'directive is required' }, { status: 400 })
    }

    const trimmed = directive.trim().substring(0, 2000)

    const backend = detectBackend()
    let parsed: ParsedTask[]
    if (backend !== 'template') {
      parsed = await janieAI(trimmed)
    } else {
      parsed = janieRuleBased(trimmed)
    }

    // Insert tasks
    const { data: inserted, error } = await supabase
      .from('agent_tasks')
      .insert(parsed.map(p => ({ ...p, status: 'pending' })))
      .select('id, assigned_to')

    if (error) throw error

    const uniqueAgents = Array.from(new Set(parsed.map(p => p.assigned_to)))
    const taskIds = inserted?.map(t => t.id) ?? []

    // Janie logs the routing decision
    await supabase.from('agent_logs').insert([{
      agent_name: 'Janie',
      action_desc: `[${backend.toUpperCase()}] Directive รับแล้ว → ส่งงานไปยัง ${uniqueAgents.join(', ')}`,
      status: 'completed',
    }])

    // Write Janie's routing message to agent_messages (visible in Janie's chat)
    const janieReply = backend !== 'template'
      ? `รับทราบแล้วค่ะ ได้ส่ง task ให้ ${uniqueAgents.join(' และ ')} แล้ว จะติดตามความคืบหน้าให้นะคะ`
      : `รับทราบค่ะ ประมวลผลแล้ว — มอบหมายงานให้ ${uniqueAgents.join(', ')} เรียบร้อยแล้วค่ะ`

    await supabase.from('agent_messages').insert({
      agent_id: 'Janie',
      role: 'agent',
      content: janieReply,
    })

    // Trigger specialist workers (non-blocking)
    if (taskIds.length > 0) {
      triggerWorkers(taskIds)
    }

    return NextResponse.json({
      ok: true,
      task_ids: taskIds,
      tasks_created: parsed.length,
      assigned_to: uniqueAgents,
      parsed_by: backend !== 'template' ? `janie-${backend}` : 'rule-based',
      janie_reply: janieReply,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const backend = detectBackend()
  return NextResponse.json({
    status: 'online',
    service: 'B3 Team Avenger — Agent Bridge v2',
    backend,
    janie_ai: backend !== 'template',
    worker_mode: 'inline',
    agents: 14,
  })
}
