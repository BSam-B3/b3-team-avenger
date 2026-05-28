/**
 * POST /api/quotation/reject
 *
 * Boss rejects quotation + mark for revision
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/notify/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface RejectRequest {
  draftId: string
  reason?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: RejectRequest = await req.json()
    const { draftId, reason } = body

    if (!draftId) {
      return NextResponse.json({ error: 'draftId required' }, { status: 400 })
    }

    const { data: draft } = await supabase
      .from('quotation_drafts')
      .select('*, customers(*), quotation_templates(*)')
      .eq('id', draftId)
      .single()

    if (!draft) {
      return NextResponse.json({ error: 'draft not found' }, { status: 404 })
    }

    // ─── Update status ──────────────────────────────────────────────────────
    await supabase
      .from('quotation_drafts')
      .update({ status: 'rejected' })
      .eq('id', draftId)

    // ─── Telegram notification ──────────────────────────────────────────────
    await sendTelegram(
      `❌ <b>Quotation REJECTED</b>\n` +
      `\n` +
      `👤 ${draft.customers.name}\n` +
      `💡 ${draft.quotation_templates.name}\n` +
      `💰 ฿${draft.total_cost}\n` +
      `\n` +
      (reason ? `📝 Reason: ${reason}\n` : '') +
      `⚙️ Salesperson: ${draft.salesperson_id} — please revise`
    )

    return NextResponse.json({ ok: true, draftId, status: 'rejected' })
  } catch (err) {
    console.error('[quotation/reject error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
