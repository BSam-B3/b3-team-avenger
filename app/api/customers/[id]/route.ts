/**
 * GET    /api/customers/[id]  — โปรไฟล์ลูกค้า + ประวัติ
 * PATCH  /api/customers/[id]  — อัปเดตข้อมูล (หลัง approve)
 * DELETE /api/customers/[id]  — ลบลูกค้า
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateCustomerMd } from '../route'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [customerRes, interactionsRes] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).single(),
    supabase.from('customer_interactions').select('*').eq('customer_id', id).order('created_at', { ascending: false }).limit(20),
  ])

  if (!customerRes.data) return NextResponse.json({ error: 'not found' }, { status: 404 })

  return NextResponse.json({
    ok:           true,
    customer:     customerRes.data,
    interactions: interactionsRes.data ?? [],
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body   = await req.json()

  const { error } = await supabase
    .from('customers')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Regenerate .md
  const { data } = await supabase.from('customers').select('*').eq('id', id).single()
  if (data) await generateCustomerMd(data)

  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
