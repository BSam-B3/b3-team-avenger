/**
 * lib/customers/learn.ts
 *
 * Customer Intelligence — ตรวจจับข้อมูลลูกค้าจากการสนทนา
 * และส่ง proposal ให้ B3 approve ก่อน update จริง
 *
 * ตัวอย่าง:
 *   "คุณปักษิณบอกว่าชื่อเล่น กุ๊ก"
 *   → propose: customer=ปักษิณ, field=nickname, new_value=กุ๊ก
 */

import { callAITracked } from '@/lib/ai/client'

interface CustomerProposal {
  customer_name: string
  field:         string
  new_value:     string
  reason:        string
  is_new:        boolean   // true = ลูกค้าใหม่ที่ยังไม่มีในระบบ
}

// ─── Detect customer info from conversation text ──────────────────────────────

export async function detectCustomerInfo(
  text: string,
  sourceAgent: string,
): Promise<CustomerProposal[]> {

  const raw = await callAITracked({
    system: `คุณคือผู้เชี่ยวชาญตรวจจับข้อมูลลูกค้าจากบทสนทนา
วิเคราะห์ข้อความและหาข้อมูลใหม่ที่ควรบันทึกเกี่ยวกับลูกค้า

ตอบเป็น JSON array เท่านั้น (ถ้าไม่มีข้อมูลให้บันทึก ตอบ []):
[
  {
    "customer_name": "ชื่อลูกค้า",
    "field": "ชื่อ field (name/nickname/company/department/phone/email/line_id/notes/device)",
    "new_value": "ค่าใหม่",
    "reason": "ทำไมถึงอยากบันทึก (1 ประโยค)",
    "is_new": false
  }
]

Fields ที่รองรับ:
- name: ชื่อจริง
- nickname: ชื่อเล่น
- company: บริษัท
- department: แผนก
- phone: เบอร์โทร
- email: อีเมล
- line_id: Line ID
- notes: หมายเหตุ/ข้อมูลสำคัญ
- device: อุปกรณ์ที่ใช้ (ใส่ค่าเป็น JSON string)

ถ้าพบลูกค้าที่ไม่เคยบันทึกมาก่อน ให้ is_new: true`,
    userMessage: text,
    maxTokens:   400,
  }, sourceAgent, undefined)

  try {
    const m = raw.match(/\[[\s\S]*\]/)
    if (!m) return []
    return JSON.parse(m[0]) as CustomerProposal[]
  } catch {
    return []
  }
}

// ─── Submit proposals to approval queue ──────────────────────────────────────

export async function proposeCustomerUpdates(
  proposals:     CustomerProposal[],
  sourceAgent:   string,
  sourceContext: string,
  appUrl:        string,
): Promise<void> {
  for (const p of proposals) {
    try {
      await fetch(`${appUrl}/api/customers/updates`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          customer_name:  p.customer_name,
          field:          p.is_new ? 'new_customer' : p.field,
          new_value:      p.is_new
            ? JSON.stringify({ name: p.customer_name, [p.field]: p.new_value })
            : p.new_value,
          reason:         p.reason,
          source_agent:   sourceAgent,
          source_context: sourceContext.slice(0, 300),
        }),
      })
    } catch { /* non-critical */ }
  }
}
