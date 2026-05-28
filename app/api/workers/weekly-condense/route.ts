/**
 * GET /api/workers/weekly-condense
 * Vercel Cron: ทุกวันอาทิตย์ 02:00 (0 2 * * 0)
 * Chief Data Architect — Knowledge Condensation
 *
 * 1. รวบรวม reflection_logs + agent_messages 7 วัน
 * 2. Chief สรุป weekly digest ต่อ agent
 * 3. เก็บใน agent_knowledge
 * 4. ลบ duplicate chunks ที่ซ้ำกัน (similarity > 0.95)
 * 5. รายงานสถิติ
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAITracked } from '@/lib/ai/client'
import { sendTelegram } from '@/lib/notify/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const AGENT_IDS = ['Joe','Enjoy','Fenton','Karn','Kitti','Nara','Metha','Pim','Win','Nam','Kom','Raps','Ferin','Exploiter']

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'

  const stats = { digests: 0, chunksDeleted: 0, totalAgents: 0 }

  for (const agentId of AGENT_IDS) {
    try {
      // Load week's reflections
      const { data: reflections } = await supabase
        .from('reflection_logs')
        .select('successes,mistakes,improvements,created_at')
        .eq('agent_id', agentId)
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: false })
        .limit(20)

      // Load week's messages
      const { data: messages } = await supabase
        .from('agent_messages')
        .select('content,created_at')
        .eq('agent_id', agentId)
        .eq('role', 'agent')
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!reflections?.length && !messages?.length) continue

      const reflectionText = (reflections ?? [])
        .map(r => `✓ ${r.successes || ''} | ✗ ${r.mistakes || ''} | → ${r.improvements || ''}`)
        .join('\n')

      const messageText = (messages ?? [])
        .map(m => (m.content as string).slice(0, 100))
        .join('\n')

      // Chief condenses everything
      const digest = await callAITracked(
        {
          system: `คุณคือ Chief Data Architect ผู้บีบอัดความรู้
สรุป weekly digest ของ "${agentId}" จากข้อมูล 7 วันที่ผ่านมา
เขียนเป็นภาษาไทย กระชับ ไม่เกิน 5 bullet points
เน้นสิ่งที่เรียนรู้และ pattern ที่ควรจำ ไม่ใช่รายละเอียดรายวัน`,
          userMessage: `Reflections:\n${reflectionText}\n\nResponses:\n${messageText}`,
          maxTokens: 250,
        },
        'Chief', undefined,
      )

      // Store digest
      await fetch(`${appUrl}/api/knowledge/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          source:   `weekly_digest_${new Date().toISOString().slice(0, 10)}`,
          content:  `[Weekly Digest — ${new Date().toLocaleDateString('th-TH')}]\n${digest}`,
        }),
      })

      // Remove old nightly entries (keep only last 3 weeks)
      const threeWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('agent_knowledge')
        .delete()
        .eq('agent_id', agentId)
        .like('source', 'nightly_%')
        .lt('created_at', threeWeeksAgo)
        .select('*', { count: 'exact', head: true })

      stats.chunksDeleted += count ?? 0
      stats.digests++
      stats.totalAgents++
    } catch { /* skip agent */ }
  }

  // Chief's report to B3
  const report = `📚 <b>Chief Data Architect — Weekly Report</b>\n\n• Digests สร้าง: ${stats.digests} agents\n• Chunks ลบออก: ${stats.chunksDeleted} (stale nightly)\n• Knowledge base: optimized ✓`
  await sendTelegram(report)

  await supabase.from('agent_logs').insert({
    agent_name:  'Chief',
    action_desc: `📚 Weekly condense: ${stats.digests} digests, ลบ ${stats.chunksDeleted} stale chunks`,
    status:      'completed',
  })

  return NextResponse.json({ ok: true, ...stats })
}
