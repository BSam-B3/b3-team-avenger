/**
 * POST /api/jarvis/checklist
 * GET /api/jarvis/checklist?id=<checklist_id>
 *
 * IT Jarvis On-site Checklist:
 * 1. Start checklist for customer + site_type
 * 2. Get items from template
 * 3. Technician marks items done + uploads photos
 * 4. Complete → ZIP bundle + Telegram alert
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/notify/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface CreateChecklistRequest {
  technicianId: string
  customerId: string
  siteType: string
}

interface GetChecklistRequest {
  checklistId: string
}

// ─── POST: Create new checklist ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: CreateChecklistRequest = await req.json()
    const { technicianId, customerId, siteType } = body

    if (!technicianId || !customerId || !siteType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ─── Get template ───────────────────────────────────────────────────────
    const { data: template } = await supabase
      .from('checklist_templates')
      .select('items')
      .eq('site_type', siteType)
      .single()

    if (!template) {
      return NextResponse.json({ error: `Template not found: ${siteType}` }, { status: 404 })
    }

    // ─── Create checklist ───────────────────────────────────────────────────
    const { data: checklist } = await supabase
      .from('onsite_checklists')
      .insert({
        technician_id: technicianId,
        customer_id: customerId,
        site_type: siteType,
        status: 'in_progress',
      })
      .select('id')
      .single()

    if (!checklist) {
      return NextResponse.json({ error: 'Failed to create checklist' }, { status: 500 })
    }

    const checklistId = checklist.id

    // ─── Create checklist items from template ────────────────────────────────
    const items = Array.isArray(template.items) ? template.items : Object.values(template.items)
    const itemsToInsert = items.map((item: any) => ({
      checklist_id: checklistId,
      item_name: typeof item === 'string' ? item : item.name,
      category: typeof item === 'string' ? 'general' : item.category,
      status: 'pending',
    }))

    await supabase.from('checklist_items').insert(itemsToInsert)

    // ─── Telegram notification ──────────────────────────────────────────────
    void sendTelegram(
      `🔧 <b>IT Checklist Started</b>\n` +
      `👨‍💼 Technician: ${technicianId}\n` +
      `🏢 Site: ${siteType}\n` +
      `📋 Items: ${items.length}\n\n` +
      `Start filling items and upload photos.`
    )

    return NextResponse.json({
      ok: true,
      checklistId,
      itemCount: items.length,
    })
  } catch (err) {
    console.error('[jarvis/checklist POST error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ─── GET: Fetch checklist details ────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const checklistId = req.nextUrl.searchParams.get('id')

    if (!checklistId) {
      return NextResponse.json({ error: 'checklistId query param required' }, { status: 400 })
    }

    // ─── Fetch checklist ────────────────────────────────────────────────────
    const { data: checklist } = await supabase
      .from('onsite_checklists')
      .select('*, customers(name, company_name), checklist_items(*)')
      .eq('id', checklistId)
      .single()

    if (!checklist) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 })
    }

    // ─── Calculate progress ────────────────────────────────────────────────
    const items = checklist.checklist_items || []
    const completed = items.filter((i: any) => i.status === 'done').length
    const progress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0

    return NextResponse.json({
      ok: true,
      checklistId,
      customer: checklist.customers,
      technician: checklist.technician_id,
      siteType: checklist.site_type,
      status: checklist.status,
      progress,
      items,
    })
  } catch (err) {
    console.error('[jarvis/checklist GET error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
