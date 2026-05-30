/**
 * POST /api/jarvis/complete
 *
 * Mark checklist complete + generate ZIP bundle + notify IT
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/notify/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface CompleteChecklistRequest {
  checklistId: string
}

export async function POST(req: NextRequest) {
  try {
    const body: CompleteChecklistRequest = await req.json()
    const { checklistId } = body

    if (!checklistId) {
      return NextResponse.json({ error: 'checklistId required' }, { status: 400 })
    }

    // ─── Fetch checklist ────────────────────────────────────────────────────
    const { data: checklist } = await supabase
      .from('onsite_checklists')
      .select('*, customers(name, email), checklist_items(*)')
      .eq('id', checklistId)
      .single()

    if (!checklist) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 })
    }

    const customer = checklist.customers
    const items = checklist.checklist_items || []
    const completed = items.filter((i: any) => i.status === 'done').length

    // ─── Update checklist status ────────────────────────────────────────────
    await supabase
      .from('onsite_checklists')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', checklistId)

    // ─── Generate ZIP bundle (base64-encoded JSON archive) ──────────────────
    const bundleData = {
      checklistId,
      customer: customer?.name,
      completedAt: new Date().toISOString(),
      summary: { completed, total: items.length },
      items: items.map((i: any) => ({
        topic: i.topic, status: i.status, note: i.note || '',
        updatedAt: i.updated_at,
      })),
    }
    const bundleJson = JSON.stringify(bundleData, null, 2)
    const bundleB64 = Buffer.from(bundleJson).toString('base64')

    // Store bundle URL (base64 data URI — no external storage needed)
    const bundleUrl = `data:application/json;base64,${bundleB64}`

    // ─── Send Telegram alert to IT ──────────────────────────────────────────
    await sendTelegram(
      `✅ <b>IT Checklist Complete</b>\n` +
      `🏢 ${customer.name}\n` +
      `📋 Items: ${completed}/${items.length}\n` +
      `👨‍💼 Technician: ${checklist.technician_id}\n\n` +
      `📦 Bundle: ${bundleUrl}\n` +
      `📧 Email: ${customer.email}`
    )

    // ─── Log completion ─────────────────────────────────────────────────────
    await supabase.from('agent_logs').insert({
      agent_name:  'Janie',
      action_desc: `✅ IT Checklist: ${customer.name} | ${completed}/${items.length} items`,
      status:      'completed',
    })

    return NextResponse.json({
      ok: true,
      checklistId,
      completed,
      total: items.length,
      bundleUrl,
    })
  } catch (err) {
    console.error('[jarvis/complete error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
