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
import { logError } from '@/lib/logging/error-tracker'
import { generateQuotationPDF } from '@/lib/pdf/quotation-pdf'

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

    // ─── 3. Generate real PDF with pdf-lib ──────────────────────────────────
    const pdfFileName = `quotation-${draftId}.pdf`
    const pdfBuffer = await generateQuotationPDF(draft, customer, template)
    const pdfContent = pdfBuffer.toString('base64')

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
              content: pdfContent,
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
    await logError({
      endpoint: '/api/quotation/approve',
      method: 'POST',
      status: 500,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      severity: 'critical',
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _generateQuotationHTML(draft: any, customer: any, template: any): string {
  const date = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
  const total = draft.total_cost?.toLocaleString('th-TH') || '0'
  const items = draft.line_items || []

  return `<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;font-size:13px;color:#111;margin:0;padding:32px}
  .header{display:flex;justify-content:space-between;border-bottom:3px solid #f97316;padding-bottom:16px;margin-bottom:24px}
  .logo{font-size:20px;font-weight:bold;color:#f97316}
  .doc-title{font-size:18px;font-weight:bold;text-align:right}
  .doc-num{color:#6b7280;font-size:12px;text-align:right}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
  .info-box{border:1px solid #e5e7eb;border-radius:6px;padding:12px}
  .info-box h3{font-size:11px;color:#6b7280;text-transform:uppercase;margin:0 0 8px}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  thead{background:#f97316;color:white}
  th{padding:8px 12px;text-align:left;font-size:12px}
  td{padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}
  .total-row{font-weight:bold;font-size:15px;background:#fef3ea}
  .footer{margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
  .sig{border-top:1px solid #374151;padding-top:8px}
  .sig label{font-size:11px;color:#6b7280}
  .note{margin-top:24px;background:#f9fafb;border-radius:6px;padding:12px;font-size:12px;color:#374151}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">B3 Team Avenger</div>
    <div style="color:#6b7280;font-size:12px">ใบเสนอราคา / Quotation</div>
  </div>
  <div>
    <div class="doc-title">ใบเสนอราคา</div>
    <div class="doc-num">วันที่: ${date}</div>
    <div class="doc-num">เลขที่: QT-${draft.id?.slice(0,8).toUpperCase()}</div>
  </div>
</div>

<div class="info-grid">
  <div class="info-box">
    <h3>ลูกค้า / Customer</h3>
    <strong>${customer?.name || '-'}</strong><br/>
    ${customer?.address || ''}<br/>
    ${customer?.phone || ''} ${customer?.email ? `| ${customer.email}` : ''}
  </div>
  <div class="info-box">
    <h3>รายละเอียด / Details</h3>
    <strong>${template?.name || draft.template_name || '-'}</strong><br/>
    ประเภท: ${template?.solution_type || '-'}<br/>
    อนุมัติโดย: ${draft.approver_id || '-'}
  </div>
</div>

<table>
  <thead>
    <tr><th style="width:50%">รายการ</th><th>จำนวน</th><th>ราคาต่อหน่วย</th><th>รวม</th></tr>
  </thead>
  <tbody>
    ${items.length > 0
      ? items.map((item: any) => `<tr>
          <td>${item.name || item.description || '-'}</td>
          <td>${item.qty || 1}</td>
          <td>฿${(item.unit_price || 0).toLocaleString('th-TH')}</td>
          <td>฿${((item.qty || 1) * (item.unit_price || 0)).toLocaleString('th-TH')}</td>
        </tr>`).join('')
      : `<tr><td colspan="3">${template?.name || 'บริการ IT'}</td><td>฿${total}</td></tr>`
    }
    <tr class="total-row">
      <td colspan="3" style="text-align:right">รวมทั้งสิ้น</td>
      <td>฿${total}</td>
    </tr>
  </tbody>
</table>

<div class="note">
  <strong>หมายเหตุ:</strong> ราคานี้ยังไม่รวม VAT 7% · ใบเสนอราคานี้มีผลภายใน 30 วัน
</div>

<div class="footer">
  <div class="sig">
    <label>ผู้เสนอราคา / Authorized by</label>
    <div style="height:40px"></div>
    <div>____________________________</div>
    <div style="font-size:11px;color:#6b7280">${draft.approver_id || 'ผู้มีอำนาจ'}</div>
  </div>
  <div class="sig">
    <label>ลูกค้ายืนยัน / Customer Acceptance</label>
    <div style="height:40px"></div>
    <div>____________________________</div>
    <div style="font-size:11px;color:#6b7280">${customer?.name || 'ลูกค้า'}</div>
  </div>
</div>
</body></html>`
}
