// Supabase Edge Function — process-task
// Triggered via Database Webhook when agent_tasks INSERT happens
// Deploy: supabase functions deploy process-task

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FALLBACK: Record<string, string> = {
  Janie:  'รับทราบและประสานงานเรียบร้อยแล้วค่ะ จะติดตามความคืบหน้าให้นะคะ',
  Joe:    'รับ task แล้วครับ กำลังออกแบบ architecture จะส่ง technical spec ให้ review ก่อน implement ครับ',
  Jing:   'รับงานแล้วค่ะ กำลัง sketch design ก่อน จะส่ง mockup ให้ดูค่ะ',
  Fenton: 'รับทราบครับ จะเตรียม test plan และ acceptance criteria ก่อนเริ่ม QA ครับ',
  Karn:   'รับไว้แล้วครับ กำลังคิด campaign concept จะส่ง brief ให้เร็วๆ นี้ครับ',
  Kitti:  'รับทราบครับ จะตรวจสอบ legal framework และแจ้งความเสี่ยงที่ต้องระวังครับ',
  Nara:   'รับค่ะ กำลัง brainstorm creative concept จะส่งให้ดูเร็วๆ นี้ค่ะ',
  Metha:  'รับทราบครับ จะทำ financial analysis และ scenario modeling ครับ',
  Pim:    'รับทราบค่ะ จะดำเนินการด้านบัญชีและเอกสารที่เกี่ยวข้องค่ะ',
  Win:    'รับไว้แล้วครับ กำลัง map opportunities และเตรียม approach strategy ครับ',
  Nam:    'รับเรื่องแล้วค่ะ จะดูแลและ follow up จนเสร็จค่ะ',
  Kom:    'รับทราบครับ จะทำ risk assessment และเสนอ mitigation plan ครับ',
  Raps:   'รับค่ะ จะดูแลให้กระบวนการ smooth และ document ไว้ใน knowledge base ค่ะ',
}

// Inline agent contexts (Edge Function can't read local files)
const AGENT_CONTEXTS: Record<string, string> = {
  Joe: 'คุณคือ Joe Backend & Infrastructure Architect เชี่ยวชาญ API, database, server. ตอบกระชับ บอก approach ที่จะใช้ และ timeline คร่าวๆ',
  Jing: 'คุณคือ Jing Frontend Engineer & UI Designer เชี่ยวชาญ React, Tailwind, UX. ตอบกระชับ บอก design approach และ component ที่จะทำ',
  Fenton: 'คุณคือ Fenton Quality Officer เชี่ยวชาญ testing, code review. ตอบกระชับ บอก test plan และ edge cases ที่ต้อง cover',
  Karn: 'คุณคือ Karn Marketing Lead เชี่ยวชาญ digital marketing, community. ตอบกระชับ บอก campaign concept และ KPI',
  Kitti: 'คุณคือ Kitti Legal Head เชี่ยวชาญ Thai law, compliance. ตอบกระชับ บอก legal framework ที่เกี่ยวข้องและความเสี่ยง',
  Nara: 'คุณคือ Nara Creative Director เชี่ยวชาญ content, brand, social media. ตอบกระชับ บอก creative concept และ content direction',
  Metha: 'คุณคือ Metha CFO เชี่ยวชาญ financial modeling, ROI. ตอบกระชับ บอก financial impact และ scenario analysis',
  Pim: 'คุณคือ Pim Head of Accounting เชี่ยวชาญ Thai accounting, tax. ตอบกระชับ บอกขั้นตอนและ deadline',
  Win: 'คุณคือ Win VP Business Development เชี่ยวชาญ partnerships, deals. ตอบกระชับ บอก opportunity และ approach strategy',
  Nam: 'คุณคือ Nam Customer Support Head เชี่ยวชาญ service, mediation. ตอบกระชับ แสดง empathy และบอก resolution path',
  Kom: 'คุณคือ Kom Chief Risk Officer เชี่ยวชาญ risk assessment, security. ตอบกระชับ บอก risk ที่พบและ mitigation plan',
  Raps: 'คุณคือ Raps CHRO เชี่ยวชาญ HR, knowledge management. ตอบกระชับ บอก process และ documentation approach',
  Janie: 'คุณคือ Janie AI Orchestrator ประสานงานทีม. ตอบกระชับ แจ้งสถานะและ next steps',
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()

    // Supabase webhook sends: { type, table, record, old_record }
    const record = payload.record ?? payload
    const task_id: string = record.id
    const agent_id: string = record.assigned_to
    const task_detail: string = record.task_detail

    if (!task_id || !agent_id || !task_detail) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Skip non-pending tasks (idempotent)
    const { data: task } = await supabase.from('agent_tasks').select('status').eq('id', task_id).single()
    if (task?.status !== 'pending') {
      return new Response(JSON.stringify({ ok: true, skipped: true }))
    }

    await supabase.from('agent_tasks').update({ status: 'in_progress' }).eq('id', task_id)

    let reply = FALLBACK[agent_id] ?? 'รับทราบแล้ว จะดำเนินการทันที'

    // Call Claude Haiku if API key available
    if (anthropicKey) {
      const ctx = AGENT_CONTEXTS[agent_id] ?? `คุณคือ ${agent_id} สมาชิกทีม B3`
      try {
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 300,
            system: `${ctx}\n\nตอบเป็นภาษาไทย ไม่เกิน 3 ประโยค: รับทราบ task → บอก approach → บอก next step`,
            messages: [{ role: 'user', content: `Task: ${task_detail}` }],
          }),
        })
        const aiData = await aiRes.json()
        if (aiData.content?.[0]?.text) reply = aiData.content[0].text.trim()
      } catch { /* use fallback */ }
    }

    // Write to agent_messages
    await supabase.from('agent_messages').insert({
      agent_id,
      role: 'agent',
      content: reply,
      task_id,
    })

    // Log
    await supabase.from('agent_logs').insert([{
      agent_name: agent_id,
      action_desc: `รับ task: "${task_detail.substring(0, 60)}${task_detail.length > 60 ? '...' : ''}"`,
      status: 'completed',
    }])

    return new Response(JSON.stringify({ ok: true, agent: agent_id, reply }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
