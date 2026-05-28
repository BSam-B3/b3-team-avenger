/**
 * GET   /api/customers/updates          — pending updates รออนุมัติ
 * POST  /api/customers/updates          — agents propose an update
 * PATCH /api/customers/updates/[id]     — B3 approve / reject
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateCustomerMd } from '../route'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// ─── GET: pending updates ─────────────────────────────────────────────────────

export async function GET() {
  const { data } = await supabase
    .from('customer_updates')
    .select(`
      id, customer_id, customer_name, field, old_value, new_value,
      reason, source_agent, source_context, status, created_at,
      customers(name, company)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json({ ok: true, updates: data ?? [] })
}

// ─── POST: agent proposes update ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    customer_id?:    string
    customer_name?:  string    // ถ้าเป็นลูกค้าใหม่ที่ยังไม่มีในระบบ
    field:           string
    old_value?:      string
    new_value:       string
    reason?:         string
    source_agent?:   string
    source_context?: string
  }

  if (!body.field || !body.new_value) {
    return NextResponse.json({ error: 'field and new_value required' }, { status: 400 })
  }

  // ถ้ามีชื่อ แต่ไม่มี id → หาใน DB ก่อน
  if (!body.customer_id && body.customer_name) {
    const { data: found } = await supabase
      .from('customers')
      .select('id')
      .ilike('name', `%${body.customer_name}%`)
      .limit(1)
      .single()
    if (found) body.customer_id = found.id
  }

  const { data, error } = await supabase
    .from('customer_updates')
    .insert({
      customer_id:    body.customer_id ?? null,
      customer_name:  body.customer_name ?? null,
      field:          body.field,
      old_value:      body.old_value ?? null,
      new_value:      body.new_value,
      reason:         body.reason ?? null,
      source_agent:   body.source_agent ?? 'Janie',
      source_context: body.source_context ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: data.id })
}

// ─── PATCH /api/customers/updates?action=approve&id=xxx ──────────────────────

export async function PATCH(req: NextRequest) {
  const { id, action } = await req.json() as { id: string; action: 'approve' | 'reject' }

  if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 })

  // Mark reviewed
  await supabase
    .from('customer_updates')
    .update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', id)

  if (action !== 'approve') return NextResponse.json({ ok: true })

  // Apply the update
  const { data: upd } = await supabase
    .from('customer_updates')
    .select('*')
    .eq('id', id)
    .single()

  if (!upd) return NextResponse.json({ ok: true })

  if (upd.customer_id) {
    // อัปเดต field ในตาราง customers
    await supabase
      .from('customers')
      .update({ [upd.field]: upd.new_value, updated_at: new Date().toISOString() })
      .eq('id', upd.customer_id)

    // Regenerate .md
    const { data: c } = await supabase.from('customers').select('*').eq('id', upd.customer_id).single()
    if (c) await generateCustomerMd(c)

  } else if (upd.customer_name && upd.field === 'new_customer') {
    // สร้างลูกค้าใหม่
    const parsed = JSON.parse(upd.new_value) as { name: string; [k: string]: string }
    const { data: newC } = await supabase
      .from('customers')
      .insert({ ...parsed, source: 'learned' })
      .select('id')
      .single()
    if (newC) await generateCustomerMd({ ...parsed, id: newC.id as string })
  }

  return NextResponse.json({ ok: true })
}
