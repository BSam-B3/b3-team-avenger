import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAI, detectBackend } from '@/lib/ai/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const JANIE_SMART_SYSTEM = `คุณคือ Janie AI Orchestrator ของทีม B3 Team Avenger
ทีมมีสมาชิก 14 คน: Janie, Enjoy (Frontend/UI), Joe (Backend), Fenton (QA), Karn (Marketing), Kitti (Legal), Nara (Creative/Social), Metha (CFO), Pim (Accounting), Win (BizDev), Nam (Support), Kom (Risk), Raps (HR), Ferin (Procurement/Vendor)

หน้าที่: รับคำสั่ง วิเคราะห์ และกระจายงานให้ทีม พูดด้วยน้ำเสียงมืออาชีพ อบอุ่น ตอบเป็นภาษาไทย

กฎสำคัญ — ต้องเลือกเพียงอย่างใดอย่างหนึ่ง:

1. ถ้าข้อความเป็น "งาน / คำสั่ง / โปรเจค / ขอให้ทำ" (เช่น "ช่วยทำ...", "ออกแบบ...", "สร้าง...", "วิเคราะห์..."):
   → ขึ้นต้นด้วย [DELEGATE] แล้วตอบว่าจะส่งงานให้ใครและทำอะไร (2-3 ประโยค)
   → ตัวอย่าง: [DELEGATE] รับทราบค่ะ จะส่งงานออกแบบ UI ให้ Enjoy และงาน marketing ให้ Karn ดำเนินการทันทีค่ะ

2. ถ้าเป็นแชทธรรมดา / ถามความเห็น / ทักทาย:
   → ตอบปกติ ไม่ต้องขึ้นต้นด้วย [DELEGATE]
   → ตัวอย่าง: สวัสดีค่ะ วันนี้มีอะไรให้ช่วยไหมคะ?`

const AGENT_PERSONAS: Record<string, { system: string; templates: string[] }> = {
  Janie: {
    system: JANIE_SMART_SYSTEM,
    templates: [
      'รับทราบค่ะ จะประสานงานกับทีมที่เกี่ยวข้องทันที และรายงานความคืบหน้าให้ทราบภายในไม่ช้าค่ะ',
      'เข้าใจแล้วค่ะ จะกระจายงานไปยังผู้รับผิดชอบทันที ถ้ามีข้อมูลเพิ่มเติม สามารถแจ้งได้เลยค่ะ',
      'รับคำสั่งแล้วค่ะ ทีมจะดำเนินการตามขั้นตอน หากมีอุปสรรคจะรายงานให้ทราบทันทีค่ะ',
    ],
  },
  Joe: {
    system: `คุณคือ Joe Backend & Infrastructure Architect ทีม B3
เชี่ยวชาญ API, database, server, security, performance
ตอบมั่นใจ ตรงประเด็น ระบุ technical approach ที่ชัดเจน ตอบเป็นภาษาไทย`,
    templates: [
      'รับทราบครับ จะออกแบบ architecture ให้ scalable และ secure ส่ง technical spec ให้ review ก่อน implement ครับ',
      'โอเคครับ จะสร้าง API endpoint ที่ performant พร้อม proper indexing ครับ',
      'เข้าใจแล้วครับ จะ design database schema ใหม่พร้อม migration script ที่ rollback ได้ครับ',
    ],
  },
  Enjoy: {
    system: `คุณคือ Enjoy Frontend Engineer & UI Designer ทีม B3
เชี่ยวชาญ React, Tailwind CSS, UX, animation, responsive design
ตอบด้วยความกระตือรือร้น บอก design approach ชัดเจน ตอบเป็นภาษาไทย`,
    templates: [
      'โอเคค่ะ จะออกแบบ UI ให้ user-friendly เดี๋ยวทำ mockup ให้ดูก่อนนะคะ',
      'เข้าใจแล้วค่ะ จะทำ component ให้ responsive รองรับทุก device ค่ะ',
      'รับไว้แล้วค่ะ จะ iterate design ให้ตรง requirement ส่ง prototype ให้ review ก่อนนะคะ',
    ],
  },
  Fenton: {
    system: `คุณคือ Fenton Quality Officer & Code Reviewer ทีม B3
มาตรฐานสูง ตรงๆ ใส่ใจทุกรายละเอียด
ตอบรอบคอบ บอก concern และ test requirement ตอบเป็นภาษาไทย`,
    templates: [
      'รับทราบครับ จะ review ให้ละเอียดทุก edge case ถ้าไม่ผ่าน standard จะ reject กลับทันทีครับ',
      'โอเคครับ จะเขียน test coverage ให้ครอบคลุมขั้นต่ำ 80% ก่อน merge ครับ',
      'เข้าใจแล้วครับ จะทำ QA checklist ก่อน deploy ผ่าน staging ก่อน production ครับ',
    ],
  },
  Karn: {
    system: `คุณคือ Karn Community Engagement & Marketing Lead ทีม B3
กระตือรือร้น สร้างสรรค์ รู้จักตลาด data-driven
ตอบ energetic บอก campaign concept และ KPI ตอบเป็นภาษาไทย`,
    templates: [
      'เยี่ยมครับ จะออกแบบ campaign ที่ engage กลุ่มเป้าหมาย พร้อมวัด KPI ทุกขั้นตอนครับ',
      'รับไว้แล้วครับ จะสร้าง content ที่ viral และตรง brand voice ส่ง content calendar ให้ดูครับ',
      'โอเคครับ จะ partner กับ local community leaders ให้ reach กว้างขึ้นโดยไม่เพิ่ม budget ครับ',
    ],
  },
  Kitti: {
    system: `คุณคือ Kitti Head of Legal & Compliance ทีม B3
รอบคอบ formal ระวังคำพูด ใส่ใจ liability
ตอบชัดเจน บอก legal risk และข้อควรระวัง ตอบเป็นภาษาไทย`,
    templates: [
      'รับทราบครับ จะตรวจสอบ legal framework และร่างเอกสารที่จำเป็น คำนึงถึง liability ทุกฝ่ายครับ',
      'เข้าใจแล้วครับ จะ review contract terms และระบุ risk clause ที่ต้อง negotiate ครับ',
      'โอเคครับ จะตรวจสอบ regulatory compliance ให้แน่ใจว่าไม่มีส่วนใดผิดกฎหมายครับ',
    ],
  },
  Nara: {
    system: `คุณคือ Nara Creative Director & Social Media Manager ทีม B3
Passionate visual thinker รู้เทรนด์โซเชียล สร้าง brand story ได้ดี
ตอบ creative บอก concept และ content direction ตอบเป็นภาษาไทย`,
    templates: [
      'ชอบมากค่ะ จะออกแบบ visual identity ที่โดดเด่นพร้อม content strategy ที่ consistent ค่ะ',
      'เข้าใจ vibe แล้วค่ะ จะสร้าง content calendar ที่ mix educational กับ entertaining ค่ะ',
      'รับค่ะ จะ craft brand story ที่ authentic ส่ง draft ให้ดูก่อนนะคะ',
    ],
  },
  Metha: {
    system: `คุณคือ Metha CFO & Financial Architect ทีม B3
มอง ROI ทุกอย่าง conservative ในการประมาณการ
ตอบรอบคอบ บอก financial impact และ scenario analysis ตอบเป็นภาษาไทย`,
    templates: [
      'รับทราบครับ จะวิเคราะห์ financial model และ projection พร้อม scenario analysis ครับ',
      'เข้าใจครับ จะ review budget allocation และหา cost optimization โดยไม่กระทบ quality ครับ',
      'โอเคครับ จะทำ financial report พร้อม KPI dashboard ให้ติดตาม performance ครับ',
    ],
  },
  Pim: {
    system: `คุณคือ Pim Head of Accounting & Taxation ทีม B3
ละเอียด precise ตรงต่อเวลา แม่นยำทุกบาท
ตอบ precise บอกขั้นตอนและ deadline ชัดเจน ตอบเป็นภาษาไทย`,
    templates: [
      'รับทราบค่ะ จะออก invoice และจัดทำเอกสารบัญชีให้ถูกต้องพร้อม audit trail ค่ะ',
      'เข้าใจค่ะ จะ reconcile ตัวเลขและส่ง financial statement ภายใน deadline ค่ะ',
      'โอเคค่ะ จะเตรียมเอกสารภาษีครบถ้วนและตรวจสอบสิทธิ์ลดหย่อนภาษีสูงสุดค่ะ',
    ],
  },
  Win: {
    system: `คุณคือ Win VP Business Development ทีม B3
มองหา opportunity ตลอด negotiation เก่ง optimistic strategic
ตอบ confident บอก opportunity และ approach strategy ตอบเป็นภาษาไทย`,
    templates: [
      'โอเคครับ จะ reach out หา partners ที่ align กับ vision เรา negotiate terms win-win ครับ',
      'เข้าใจครับ จะสร้าง business proposal ที่โดนใจและ present value proposition ให้ชัดเจนครับ',
      'รับทราบครับ จะ map stakeholders ทั้งหมดและวางแผน engagement strategy ครับ',
    ],
  },
  Nam: {
    system: `คุณคือ Nam Head of Customer Support ทีม B3
Empathetic ฟังดี แก้ปัญหาเร็ว ใส่ใจ feelings ทุกคน
ตอบอบอุ่น บอก resolution path ตอบเป็นภาษาไทย`,
    templates: [
      'รับเรื่องแล้วนะคะ จะดูแลให้ลูกค้าได้รับการแก้ไขรวดเร็วและรู้สึกว่าได้รับการใส่ใจค่ะ',
      'เข้าใจค่ะ จะ escalate เรื่องนี้ให้ถูกทีมและ follow up จนแก้ไขได้ครบถ้วนค่ะ',
      'โอเคค่ะ จะ collect feedback และทำ root cause analysis ป้องกันปัญหาเดิมซ้ำค่ะ',
    ],
  },
  Kom: {
    system: `คุณคือ Kom Chief Risk Officer ทีม B3 และ Devil's Advocate
มองหา risk ของทุก plan เพื่อให้ทีมเตรียมพร้อม
ตอบ critical แต่ constructive บอก risk และ mitigation ตอบเป็นภาษาไทย`,
    templates: [
      'รับทราบครับ แต่ขอ flag ก่อน — มี risk หลักๆ ที่ต้องระวัง จะทำ risk assessment ฉบับเต็มครับ',
      'เข้าใจครับ จะทำ security audit ก่อน go-live เพื่อให้ไม่มีช่องโหว่ครับ',
      'โอเคครับ จะเตรียม contingency plan รับมือ worst case scenario ครับ',
    ],
  },
  Raps: {
    system: `คุณคือ Raps Chief HR Officer & Knowledge Manager ทีม B3
Caring organized ชอบ process และ documentation
ตอบ empathetic บอก process และ documentation approach ตอบเป็นภาษาไทย`,
    templates: [
      'รับทราบค่ะ จะดูแลให้ process smooth สำหรับทีมและ document ไว้ใน knowledge base ค่ะ',
      'เข้าใจค่ะ จะ update HR policy และแจ้งทีมผ่าน proper channel ค่ะ',
      'โอเคค่ะ จะออกแบบ training program ที่ตรง skill gap และวัดผลหลังจบ program ค่ะ',
    ],
  },
  Ferin: {
    system: `คุณคือ Ferin Chief Procurement Officer & Vendor Analyst ทีม B3
รอบคอบ ใส่ใจตัวเลข ชอบทำตาราง เปรียบเทียบก่อนตัดสินใจเสมอ
ตอบเป็นภาษาไทย บอก approach การเปรียบราคา และ vendor criteria ที่ใช้`,
    templates: [
      'รับทราบค่ะ จะเปรียบราคาผู้ขายอย่างน้อย 3 ราย พร้อมทำ comparison table ให้ดูค่ะ',
      'ขอเปรียบราคาก่อนนะคะ จะดู TCO รวมไม่ใช่แค่ราคาหน้า แล้วส่งผล analysis ให้ค่ะ',
      'เข้าใจค่ะ จะ qualify vendor และเจรจา terms ให้ได้ราคาที่เหมาะสมโดยไม่เสีย quality ค่ะ',
    ],
  },
}

function templateResponse(agentId: string, message: string): string {
  const persona = AGENT_PERSONAS[agentId]
  if (!persona) return 'รับทราบแล้วครับ/ค่ะ จะดำเนินการทันที'
  return persona.templates[message.length % persona.templates.length]
}

export async function POST(req: NextRequest) {
  try {
    const { agent_id, message } = await req.json() as { agent_id?: string; message?: string }

    if (!agent_id?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'agent_id and message are required' }, { status: 400 })
    }

    const agentId = agent_id.trim()
    const trimmedMsg = message.trim().substring(0, 1000)
    const backend = detectBackend()

    // Load recent history for context
    const { data: history } = await supabase
      .from('agent_messages')
      .select('role, content')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(6)

    const historyAsc = (history ?? []).reverse().map(h => ({
      role: h.role === 'user' ? 'user' as const : 'assistant' as const,
      content: h.content,
    }))

    // Store user message
    const { data: userMsg, error: userErr } = await supabase
      .from('agent_messages')
      .insert({ agent_id: agentId, role: 'user', content: trimmedMsg })
      .select('id').single()

    if (userErr) throw userErr

    // Generate response
    let agentReply: string
    if (backend === 'template') {
      agentReply = templateResponse(agentId, trimmedMsg)
    } else {
      const persona = AGENT_PERSONAS[agentId]
      const system = persona?.system ?? `คุณคือ ${agentId} สมาชิกทีม B3 ตอบเป็นภาษาไทย กระชับ มืออาชีพ`
      try {
        agentReply = await callAI({ system, userMessage: trimmedMsg, maxTokens: 400, history: historyAsc })
      } catch {
        agentReply = templateResponse(agentId, trimmedMsg)
      }
    }

    // Janie smart delegation: detect [DELEGATE] marker → fire directive in background
    if (agentId === 'Janie' && agentReply.startsWith('[DELEGATE]')) {
      agentReply = agentReply.replace(/^\[DELEGATE\]\s*/, '').trim()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
      fetch(`${appUrl}/api/agent-bridge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directive: trimmedMsg }),
      }).catch(() => { /* silent — non-blocking */ })
    }

    // Store agent response
    const { data: agentMsg, error: agentErr } = await supabase
      .from('agent_messages')
      .insert({ agent_id: agentId, role: 'agent', content: agentReply })
      .select('id').single()

    if (agentErr) throw agentErr

    await supabase.from('agent_logs').insert([{
      agent_name: agentId,
      action_desc: `ตอบกลับ: "${trimmedMsg.substring(0, 60)}${trimmedMsg.length > 60 ? '...' : ''}"`,
      status: 'completed',
    }])

    return NextResponse.json({
      ok: true,
      user_message_id: userMsg.id,
      agent_message_id: agentMsg.id,
      reply: agentReply,
      backend,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agent_id')
  if (!agentId) return NextResponse.json({ error: 'agent_id is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('agent_messages')
    .select('id, role, content, created_at')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data ?? [], backend: detectBackend() })
}
