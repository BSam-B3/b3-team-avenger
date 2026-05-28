/**
 * POST /api/quotation/approve
 *
 * Boss approves quotation:
 * 1. Mark as approved
 * 2. Generate PDF
 * 3. Send email to customer
 * 4. Telegram confirmation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/notify/telegram'
import sgMail from '@sendgrid/mail'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

interface ApproveRequest {
  draftId: string
  approverName: string
}

export async function POST(req: NextRequest) {
  try {
    const body: ApproveRequest = await req.json()
    const { draftId, approverName } = body

    if (!draftId) {
      return NextResponse.json({ error: 'draftId required' }, { status: 400 })
    }

    // ─── 1. Fetch draft + customer + template ────────────────────────────────
    const { data: draft } = await supabase
      .from('quotation_drafts')
      .select('*, customers(*), quotation_templates(*)')
      .eq('id', draftId)
      .single()

    if (!draft) {
      return NextResponse.json({ error: 'draft not found' }, { status: 404 })
    }

    const customer = draft.customers
    const template = draft.quotation_templates

    // ─── 2. Update status ───────────────────────────────────────────────────
    await supabase
      .from('quotation_drafts')
      .update({
        status: 'approved',
        approver_id: approverName,
        approved_at: new Date().toISOString(),
      })
      .eq('id', draftId)

    // ─── 3. Generate PDF (placeholder) ──────────────────────────────────────
    const pdfFileName = `quotation-${draftId}.pdf`
    // TODO: Use pdf-lib to generate actual PDF

    // ─── 4. Send email to customer ──────────────────────────────────────────
    let emailSent = false
    try {
      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
        await sgMail.send({
          to: draft.customer_email,
          from: process.env.SENDGRID_FROM_EMAIL,
          subject: `Quotation Ready: ${template.name}`,
          html: `
<h2>Your Quotation is Ready</h2>
<p>Dear ${customer.name},</p>
<p>Your quotation for <strong>${template.name}</strong> has been prepared.</p>
<p><strong>Total Cost: ฿${draft.total_cost.toLocaleString('th-TH')}</strong></p>
<p>Please find the quotation attached.</p>
<p>Please contact us if you have any questions.</p>
          `,
          attachments: [
            {
              filename: pdfFileName,
              content: Buffer.from('PDF placeholder').toString('base64'),
              type: 'application/pdf',
            },
          ],
        })
        emailSent = true
      }
    } catch (err) {
      console.warn('[quotation/approve] Email failed:', err)
    }

    // ─── 5. Telegram confirmation ───────────────────────────────────────────
    await sendTelegram(
      `✅ <b>Quotation APPROVED</b>\n` +
      `\n` +
      `👤 ${customer.name}\n` +
      `💡 ${template.name}\n` +
      `💰 ฿${draft.total_cost.toLocaleString('th-TH')}\n` +
      `\n` +
      `${emailSent ? '✉️ Email sent to customer' : '⚠️ Email pending'}\n` +
      `👤 Approver: ${approverName}`
    )

    // ─── 6. Log ─────────────────────────────────────────────────────────────
    await supabase.from('agent_logs').insert({
      agent_name:  'Janie',
      action_desc: `✅ Quotation approved: ${customer.name} | ฿${draft.total_cost}`,
      status:      'completed',
    })

    return NextResponse.json({
      ok: true,
      draftId,
      status: 'approved',
      emailSent,
    })
  } catch (err) {
    console.error('[quotation/approve error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
