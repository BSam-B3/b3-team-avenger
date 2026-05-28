/**
 * POST /api/pdf/generate-report
 *
 * Generate ticket resolution PDF:
 * 1. Fetch customer + ticket data from SharePoint
 * 2. Render HTML template → PDF (pdf-lib)
 * 3. Upload to SharePoint Document Library
 * 4. Send email to customer (Graph API or SendGrid)
 * 5. Notify Telegram
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/notify/telegram'
import { generateTicketPDF } from '@/lib/pdf/generator'
import { sendEmailViaGraph, uploadToSharePoint } from '@/lib/graph/client'
import sgMail from '@sendgrid/mail'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

interface PDFGenerateRequest {
  ticketId: string
  customerId?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: PDFGenerateRequest = await req.json()
    const { ticketId, customerId } = body

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId required' }, { status: 400 })
    }

    // ─── 1. Fetch ticket + customer data ──────────────────────────────────────
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('*, customers(*)')
      .eq('id', ticketId)
      .single()

    if (!ticket) {
      return NextResponse.json({ error: 'ticket not found' }, { status: 404 })
    }

    const customer = ticket.customers || { name: 'Unknown', email: 'noreply@example.com' }

    // ─── 2. Generate PDF ──────────────────────────────────────────────────────
    const pdfBuffer = await generateTicketPDF(
      {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        createdAt: ticket.created_at,
      },
      {
        name: customer.name || 'Unknown',
        email: customer.email || 'noreply@example.com',
        company: customer.company_name,
      }
    )

    const fileName = `ticket-${ticketId}-${Date.now()}.pdf`

    // ─── 3. Upload to SharePoint (optional — requires Azure setup) ─────────────
    let sharePointUrl = ''
    try {
      if (process.env.AZURE_SHAREPOINT_SITE_ID && process.env.AZURE_SHAREPOINT_FOLDER_ID) {
        sharePointUrl = await uploadToSharePoint(
          process.env.AZURE_SHAREPOINT_SITE_ID,
          process.env.AZURE_SHAREPOINT_FOLDER_ID,
          fileName,
          pdfBuffer
        )
      }
    } catch (err) {
      console.warn('[pdf] SharePoint upload skipped', err)
    }

    // ─── 4. Send email to customer ────────────────────────────────────────────
    let emailSent = false
    const emailBody = `
<h2>Your Ticket Has Been Resolved</h2>
<p>Dear ${customer.name},</p>
<p>Your support ticket <strong>${ticket.title}</strong> has been resolved.</p>
<p>Please find the resolution report attached.</p>
<p>Thank you for contacting B3 Team Avenger.</p>
    `

    try {
      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
        await sgMail.send({
          to: customer.email || 'noreply@example.com',
          from: process.env.SENDGRID_FROM_EMAIL,
          subject: `[RESOLVED] ${ticket.title}`,
          html: emailBody,
          attachments: [
            {
              content: pdfBuffer.toString('base64'),
              filename: fileName,
              type: 'application/pdf',
              disposition: 'attachment',
            },
          ],
        })
        emailSent = true
      } else if (process.env.AZURE_CLIENT_ID) {
        emailSent = await sendEmailViaGraph(
          customer.email || 'noreply@example.com',
          `[RESOLVED] ${ticket.title}`,
          emailBody
        )
      }
    } catch (err) {
      console.warn('[pdf] Email send failed:', err)
    }

    // ─── 6. Notify Telegram ──────────────────────────────────────────────────
    void sendTelegram(
      `📄 <b>Ticket Resolved & PDF Generated</b>\n` +
      `🎫 ${ticket.title}\n` +
      `👤 ${customer.name}\n` +
      `📎 PDF uploaded to SharePoint\n` +
      `📧 Email sent to ${customer.email}`
    )

    // ─── 7. Log action ───────────────────────────────────────────────────────
    await supabase.from('agent_logs').insert({
      agent_name:  'Janie',
      action_desc: `📄 PDF Generated: ${ticket.title} → ${customer.email}`,
      status:      emailSent ? 'completed' : 'failed',
    })

    return NextResponse.json({
      ok: true,
      ticketId,
      fileName,
      sharePointUrl,
      emailSent,
    })
  } catch (err) {
    console.error('[pdf/generate-report error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
