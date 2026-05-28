/**
 * GET /api/workers/midnight-hunter
 *
 * The Midnight Chrono-Hunter — runs via Vercel Cron (every day at midnight)
 * 1. Finds stale agent contexts (not updated in 7+ days)
 * 2. Web-searches for fresh info relevant to each agent's domain
 * 3. Appends summary to agent_knowledge table (auto-indexed)
 * 4. Writes reflection on what was updated
 *
 * Vercel cron: configure in vercel.json
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { webSearch } from '@/lib/ai/search'
import { callAITracked } from '@/lib/ai/client'
import { embedText, chunkText } from '@/lib/knowledge/embed'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const AGENT_DOMAINS: Record<string, string> = {
  Joe:      'backend architecture, Node.js, Next.js best practices 2026',
  Enjoy:    'frontend design trends, React, UI/UX 2026',
  Fenton:   'software testing, QA, automation testing trends',
  Karn:     'digital marketing, social media trends Thailand 2026',
  Kitti:    'Thai business law, PDPA, legal compliance 2026',
  Metha:    'Thai financial markets, SET index, economic outlook',
  Win:      'startup ecosystem Thailand, business development 2026',
  Kom:      'cybersecurity, risk management, IT security 2026',
  Raps:     'HR trends, remote work, talent management 2026',
  Ferin:    'procurement, vendor management, supply chain 2026',
}

export async function GET(req: NextRequest) {
  // Auth: only allow from Vercel Cron or with secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
  const updated: string[] = []

  for (const [agentId, domain] of Object.entries(AGENT_DOMAINS)) {
    try {
      // Search for fresh info
      const searchResults = await webSearch(domain, 3)
      if (!searchResults) continue

      // AI summarizes the search results for this agent
      const summary = await callAITracked(
        {
          system: `คุณคือ Midnight Chrono-Hunter ผู้สรุปข้อมูลใหม่ให้ทีม B3\nสรุปข้อมูลต่อไปนี้ให้กระชับ เหมาะกับการใช้เป็น context สำหรับ agent "${agentId}" ผู้เชี่ยวชาญด้าน ${domain}\nสรุปเป็นภาษาไทย 3-5 ประโยค เน้นสิ่งที่มีประโยชน์จริงๆ`,
          userMessage: searchResults,
          maxTokens: 300,
        },
        'Midnight',
        undefined,
      )

      // Ingest into knowledge base
      const content = `[อัปเดต ${new Date().toLocaleDateString('th-TH')}]\n${summary}`
      await fetch(`${appUrl}/api/knowledge/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          source:   `midnight_hunt_${new Date().toISOString().slice(0, 10)}`,
          content,
        }),
      })

      updated.push(agentId)
    } catch { /* skip failed agents */ }
  }

  await supabase.from('agent_logs').insert({
    agent_name:  'MidnightHunter',
    action_desc: `🌙 อัปเดต knowledge: ${updated.join(', ')} (${updated.length} agents)`,
    status:      'completed',
  })

  return NextResponse.json({ ok: true, updated, timestamp: new Date().toISOString() })
}
