/**
 * GET /api/workers/midnight-hunter
 * Vercel Cron: ทุกเที่ยงคืน (0 0 * * *)
 *
 * โหมด WEEKDAY  — แต่ละ agent อัปเดต domain ตัวเอง (เงียบๆ)
 * โหมด WEEKEND  — GROUP EXPEDITION: พาทีมออกท่องโลกด้วยกัน
 *   → แต่ละ agent ค้นหาสิ่งที่ตัวเองสนใจ
 *   → Raps รวมรายงาน expedition และเขียน "field trip report"
 *   → ส่ง Telegram แจ้ง B3
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { webSearch } from '@/lib/ai/search'
import { callAITracked } from '@/lib/ai/client'
import { sendTelegram } from '@/lib/notify/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// domain + curiosity: สิ่งที่ agent อยากรู้มากกว่า job description ปกติ
const AGENT_UNIVERSE: Record<string, { domain: string; curiosity: string; emoji: string }> = {
  Joe:    { domain: 'Node.js Next.js backend architecture 2026', curiosity: 'quantum computing impact on software', emoji: '⚙️' },
  Enjoy:  { domain: 'React UI/UX design trends 2026', curiosity: 'generative AI in creative tools Figma', emoji: '🎨' },
  Fenton: { domain: 'software testing automation QA 2026', curiosity: 'chaos engineering fault tolerance', emoji: '🔬' },
  Karn:   { domain: 'digital marketing Thailand social media 2026', curiosity: 'creator economy viral content strategy', emoji: '📣' },
  Kitti:  { domain: 'Thai business law PDPA compliance 2026', curiosity: 'AI regulation global legal landscape', emoji: '⚖️' },
  Nara:   { domain: 'visual design branding creative direction 2026', curiosity: 'AI image generation art direction', emoji: '🖼️' },
  Metha:  { domain: 'Thai financial markets SET index 2026', curiosity: 'DeFi crypto institutional adoption', emoji: '📊' },
  Pim:    { domain: 'accounting tax compliance Thailand 2026', curiosity: 'blockchain accounting automation', emoji: '📒' },
  Win:    { domain: 'startup business development Thailand 2026', curiosity: 'global venture capital trends emerging markets', emoji: '🚀' },
  Kom:    { domain: 'cybersecurity risk management 2026', curiosity: 'AI-powered threat detection zero trust', emoji: '🛡️' },
  Ferin:  { domain: 'procurement vendor management supply chain 2026', curiosity: 'sustainable procurement ESG supply chain', emoji: '📦' },
}

async function ingestKnowledge(agentId: string, source: string, content: string, appUrl: string) {
  await fetch(`${appUrl}/api/knowledge/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, source, content }),
  })
}

// ─── WEEKDAY: individual silent updates ──────────────────────────────────────

async function weekdayUpdate(appUrl: string): Promise<string[]> {
  const updated: string[] = []
  for (const [agentId, info] of Object.entries(AGENT_UNIVERSE)) {
    try {
      const results = await webSearch(info.domain, 2)
      if (!results) continue
      const summary = await callAITracked(
        {
          system: `สรุปข้อมูลนี้ให้ ${agentId} ใช้เป็น context ภาษาไทย 2-3 ประโยค เฉพาะที่มีประโยชน์จริงๆ`,
          userMessage: results,
          maxTokens: 200,
        },
        'MidnightHunter', undefined,
      )
      await ingestKnowledge(agentId, `nightly_${new Date().toISOString().slice(0, 10)}`, `[อัปเดต ${new Date().toLocaleDateString('th-TH')}]\n${summary}`, appUrl)
      updated.push(agentId)
    } catch { /* skip */ }
  }
  return updated
}

// ─── WEEKEND: Group Expedition ────────────────────────────────────────────────

interface AgentFinding {
  agentId:   string
  emoji:     string
  domain:    string
  curiosity: string
  learned:   string
  surprise:  string  // unexpected connection found
}

async function groupExpedition(appUrl: string): Promise<AgentFinding[]> {
  const findings: AgentFinding[] = []

  // Each agent goes exploring — mix domain + curiosity for richer results
  for (const [agentId, info] of Object.entries(AGENT_UNIVERSE)) {
    try {
      // Randomly mix domain search and curiosity search
      const useCuriosity = Math.random() > 0.5
      const query = useCuriosity ? info.curiosity : info.domain
      const results = await webSearch(query, 3)
      if (!results) continue

      const raw = await callAITracked(
        {
          system: `คุณคือ ${agentId} กำลังออกสำรวจโลกคืนนี้ในฐานะผู้เชี่ยวชาญ
ค้นพบสิ่งนี้: """${results}"""

ตอบในรูปแบบ JSON เท่านั้น:
{
  "learned": "สิ่งที่เรียนรู้ใหม่ที่น่าสนใจที่สุด (1-2 ประโยคภาษาไทย)",
  "surprise": "สิ่งที่ไม่คาดคิดหรือเชื่อมโยงกับงานของทีมได้ (1 ประโยค)"
}`,
          userMessage: query,
          maxTokens: 200,
        },
        agentId, undefined,
      )

      let learned = raw
      let surprise = ''
      try {
        const m = raw.match(/\{[\s\S]*\}/)
        if (m) {
          const p = JSON.parse(m[0]) as { learned: string; surprise: string }
          learned  = p.learned
          surprise = p.surprise
        }
      } catch { /* use raw */ }

      findings.push({ agentId, emoji: info.emoji, domain: useCuriosity ? info.curiosity : info.domain, curiosity: info.curiosity, learned, surprise })

      // Index finding into agent knowledge
      await ingestKnowledge(
        agentId,
        `expedition_${new Date().toISOString().slice(0, 10)}`,
        `[Expedition ${new Date().toLocaleDateString('th-TH')}]\nหัวข้อ: ${query}\n${learned}${surprise ? `\nสิ่งที่น่าสนใจ: ${surprise}` : ''}`,
        appUrl,
      )
    } catch { /* skip */ }
  }

  return findings
}

async function rapsWriteReport(findings: AgentFinding[]): Promise<string> {
  const findingsSummary = findings.map(f =>
    `${f.emoji} ${f.agentId}: ${f.learned}${f.surprise ? ` (ค้นพบ: ${f.surprise})` : ''}`
  ).join('\n')

  return callAITracked(
    {
      system: `คุณคือแรปส์ HR & Knowledge Manager ของทีม B3 Team Avenger
เมื่อคืนทีมได้ออก Group Expedition ท่องโลกด้วยกัน
เขียน "Field Trip Report" สรุปสิ่งที่ทีมค้นพบ ภาษาไทย สนุก มีชีวิต
เริ่มด้วย "🌙 Expedition Report — [วันที่]"
แล้วสรุปแต่ละคน สั้นๆ
ปิดด้วย insight ที่น่าสนใจ เชื่อมสิ่งที่แต่ละคนเรียนมาเข้าด้วยกัน
รวม 8-12 ประโยค`,
      userMessage: findingsSummary,
      maxTokens: 500,
    },
    'Raps', undefined,
  )
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
  const today  = new Date()
  const dow    = today.getDay() // 0=Sun, 5=Fri, 6=Sat
  const isWeekend = dow === 0 || dow === 5 || dow === 6

  // ── WEEKEND: Group Expedition ──
  if (isWeekend) {
    const findings = await groupExpedition(appUrl)

    if (findings.length > 0) {
      // Raps writes the expedition report
      const report = await rapsWriteReport(findings)

      // Store Raps' report as knowledge
      await ingestKnowledge('Raps', `expedition_report_${today.toISOString().slice(0, 10)}`, report, appUrl)

      // Telegram notification
      const telegramMsg = `🌙 <b>B3 Team — Group Expedition</b>\n\n${report.slice(0, 1000)}${report.length > 1000 ? '...' : ''}`
      await sendTelegram(telegramMsg)

      await supabase.from('agent_logs').insert({
        agent_name:  'MidnightHunter',
        action_desc: `🌙 Weekend Expedition: ${findings.map(f => f.agentId).join(', ')} ออกสำรวจ, Raps เขียนรายงานแล้ว`,
        status:      'completed',
      })
    }

    return NextResponse.json({ ok: true, mode: 'expedition', agents: findings.length, timestamp: today.toISOString() })
  }

  // ── WEEKDAY: silent individual updates ──
  const updated = await weekdayUpdate(appUrl)

  await supabase.from('agent_logs').insert({
    agent_name:  'MidnightHunter',
    action_desc: `🌙 Nightly update: ${updated.join(', ')} (${updated.length} agents)`,
    status:      'completed',
  })

  return NextResponse.json({ ok: true, mode: 'nightly', updated, timestamp: today.toISOString() })
}
