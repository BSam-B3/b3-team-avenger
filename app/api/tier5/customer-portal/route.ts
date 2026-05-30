// TIER 5: Customer Portal
// Features:
// - View own quotations
// - Approve quotations online
// - View checklist progress
// - Download reports

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateRequiredFields, createErrorResponse, createSuccessResponse } from '@/lib/api/validation'
import { sendTelegramMessage } from '@/lib/notifications/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: Customer's quotations
export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get('customerId')
    const action = req.nextUrl.searchParams.get('action')

    if (!customerId) {
      return createErrorResponse(
        {
          code: 'MISSING_FIELD',
          message: 'customerId required',
          status: 400,
        }
      )
    }

    // Get customer quotations
    if (!action || action === 'quotations') {
      const { data, error } = await supabase
        .from('quotation_drafts')
        .select(`
          id,
          total_cost,
          status,
          created_at,
          template:quotation_templates(name),
          salesperson:sales_person_id
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return createSuccessResponse({
        customerId,
        quotations: data || [],
        count: data?.length || 0,
      })
    }

    // Get customer checklists
    if (action === 'checklists') {
      const { data, error } = await supabase
        .from('onsite_checklists')
        .select(`
          id,
          site_type,
          status,
          created_at,
          completed_at,
          checklist_items(status)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const withProgress = data?.map((c: any) => ({
        ...c,
        progress: c.checklist_items
          ? Math.round(
              (c.checklist_items.filter((i: any) => i.status === 'done').length /
                c.checklist_items.length) *
                100
            )
          : 0,
      }))

      return createSuccessResponse({
        customerId,
        checklists: withProgress || [],
        count: withProgress?.length || 0,
      })
    }

    return createErrorResponse(
      {
        code: 'INVALID_FIELD',
        message: 'Invalid action',
        status: 400,
      }
    )
  } catch (err) {
    console.error('[tier5] portal get error:', err)
    return createErrorResponse(
      {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        status: 500,
      }
    )
  }
}

// POST: Customer approves quotation online
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const missingField = validateRequiredFields(body, ['customerId', 'quotationId', 'action'])
    if (missingField) {
      return createErrorResponse(
        {
          code: 'MISSING_FIELD',
          message: `Missing required field: ${missingField}`,
          status: 400,
        }
      )
    }

    const { customerId, quotationId, action, notes } = body

    // Verify quotation belongs to customer
    const { data: quotation, error: qErr } = await supabase
      .from('quotation_drafts')
      .select()
      .eq('id', quotationId)
      .eq('customer_id', customerId)
      .single()

    if (qErr || !quotation) {
      return createErrorResponse(
        {
          code: 'NOT_FOUND',
          message: 'Quotation not found',
          status: 404,
        }
      )
    }

    if (action === 'approve') {
      // Update status to customer-approved
      const { error: updateErr } = await supabase
        .from('quotation_drafts')
        .update({
          status: 'customer_approved',
          customer_notes: notes,
          approved_at: new Date().toISOString(),
        })
        .eq('id', quotationId)

      if (updateErr) throw updateErr

      // Send Telegram alert
      await sendTelegramMessage({
        chat_id: process.env.TELEGRAM_BOSS_CHAT_ID || '',
        text: `<b>✅ Quotation Approved by Customer</b>\n\nCustomer: ${customerId}\nQuotation: ${quotationId}\nAmount: ฿${quotation.total_cost?.toLocaleString()}\n\nStatus: APPROVED`,
        parse_mode: 'HTML',
      })

      return createSuccessResponse({
        quotationId,
        status: 'customer_approved',
        message: 'Quotation approved by customer',
      })
    }

    if (action === 'reject') {
      // Update status to customer-rejected
      const { error: updateErr } = await supabase
        .from('quotation_drafts')
        .update({
          status: 'customer_rejected',
          customer_notes: notes,
          rejected_at: new Date().toISOString(),
        })
        .eq('id', quotationId)

      if (updateErr) throw updateErr

      return createSuccessResponse({
        quotationId,
        status: 'customer_rejected',
        message: 'Quotation rejected by customer',
      })
    }

    return createErrorResponse(
      {
        code: 'INVALID_FIELD',
        message: 'Invalid action',
        status: 400,
      }
    )
  } catch (err) {
    console.error('[tier5] portal post error:', err)
    return createErrorResponse(
      {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        status: 500,
      }
    )
  }
}
