/**
 * POST /api/quotation/create-draft
 *
 * Create quotation draft + send boss approval alert
 * 1. Validate customer + template + markup
 * 2. Calculate total cost
 * 3. Create draft record
 * 4. Send Telegram to boss with [APPROVE] [REJECT] buttons
 * 5. Log action
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/notify/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface CreateQuotationRequest {
  customerId: string
  templateId: string
  salesPersonId: string
  markupPct: number
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateQuotationRequest = await req.json()
    const { customerId, templateId, salesPersonId, markupPct } = body

    // ─── 1. Validate inputs ──────────────────────────────────────────────────
    if (!customerId || !templateId || markupPct < 0 || markupPct > 500) {
      return NextResponse.json(
        { error: 'Invalid: customerId, templateId required; markup 0-500%' },
        { status: 400 }
      )
    }

    // ─── 2. Fetch customer + template ────────────────────────────────────────
    const { data: customer } = await supabase
      .from('customers')
      .select('name, email, company_name')
      .eq('id', customerId)
      .single()

    const { data: template } = await supabase
      .from('quotation_templates')
      .select('name, base_cost')
      .eq('id', templateId)
      .single()

    if (!customer || !template) {
      return NextResponse.json({ error: 'customer or template not found' }, { status: 404 })
    }

    // ─── 3. Calculate total cost ─────────────────────────────────────────────
    const totalCost = template.base_cost * (1 + markupPct / 100)

    // ─── 4. Create draft ────────────────────────────────────────────────────
    const { data: draft, error } = await supabase
      .from('quotation_drafts')
      .insert({
        customer_id: customerId,
        template_id: templateId,
        salesperson_id: salesPersonId,
        markup_pct: markupPct,
        total_cost: totalCost,
        customer_email: customer.email,
        status: 'pending_approval',
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const draftId = draft.id

    // ─── 5. Send Telegram alert to boss ──────────────────────────────────────
    const approveUrl = `${process.env.NEXT_PUBLIC_APP_URL}/quotation/${draftId}/approve`
    const rejectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/quotation/${draftId}/reject`

    await sendTelegram(
      `💼 <b>Quotation Pending Approval</b>\n` +
      `\n` +
      `👤 <b>${customer.name}</b>\n` +
      `🏢 ${customer.company_name || 'N/A'}\n` +
      `💡 Solution: ${template.name}\n` +
      `\n` +
      `📊 Cost Breakdown:\n` +
      `   Base: ฿${template.base_cost.toLocaleString('th-TH')}\n` +
      `   Markup: ${markupPct}%\n` +
      `   <b>Total: ฿${totalCost.toLocaleString('th-TH')}</b>\n` +
      `\n` +
      `👤 Salesperson: ${salesPersonId}\n` +
      `\n` +
      `🔗 <a href="${approveUrl}">✅ APPROVE</a> | <a href="${rejectUrl}">❌ REJECT</a>`
    )

    // ─── 6. Log action ──────────────────────────────────────────────────────
    await supabase.from('agent_logs').insert({
      agent_name:  'Janie',
      action_desc: `💼 Draft quotation: ${customer.name} | ฿${totalCost.toLocaleString('th-TH')}`,
      status:      'completed',
    })

    return NextResponse.json({
      ok: true,
      draftId,
      totalCost,
      status: 'pending_approval',
    })
  } catch (err) {
    console.error('[quotation/create-draft error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
