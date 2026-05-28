/**
 * GET  /api/customers         — list ลูกค้าทั้งหมด (+ search)
 * POST /api/customers         — สร้างลูกค้าใหม่
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''

  let query = supabase
    .from('customers')
    .select('id, name, nickname, company, department, phone, email, tags, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (q) {
    query = query.or(`name.ilike.%${q}%,nickname.ilike.%${q}%,company.ilike.%${q}%,phone.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Pending updates count
  const { count } = await supabase
    .from('customer_updates')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  return NextResponse.json({ ok: true, customers: data ?? [], pendingUpdates: count ?? 0 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, nickname, company, department, phone, email, line_id, notes, tags, source } = body

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const { data, error } = await supabase
    .from('customers')
    .insert({ name, nickname, company, department, phone, email, line_id, notes, tags: tags ?? [], source: source ?? 'manual' })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-generate .md file
  await generateCustomerMd({ id: data.id, name, nickname, company, department, phone, email, notes })

  return NextResponse.json({ ok: true, id: data.id })
}

// ─── Generate .md file for customer ─────────────────────────────────────────

export async function generateCustomerMd(c: {
  id: string; name: string; nickname?: string; company?: string
  department?: string; phone?: string; email?: string; notes?: string
  devices?: { name: string; os?: string; serial?: string }[]
  support_summary?: string
}) {
  const lines = [
    `# ${c.name}`,
    '',
    '## ข้อมูลติดต่อ',
    c.nickname   ? `- **ชื่อเล่น:** ${c.nickname}` : '',
    c.company    ? `- **บริษัท:** ${c.company}` : '',
    c.department ? `- **แผนก:** ${c.department}` : '',
    c.phone      ? `- **เบอร์:** ${c.phone}` : '',
    c.email      ? `- **Email:** ${c.email}` : '',
    '',
  ].filter(l => l !== undefined)

  if (c.devices?.length) {
    lines.push('## อุปกรณ์ที่ดูแล')
    c.devices.forEach((d, i) => {
      lines.push(`- **เครื่อง ${i + 1}:** ${d.name}${d.os ? ` (${d.os})` : ''}${d.serial ? ` — S/N: ${d.serial}` : ''}`)
    })
    lines.push('')
  }

  if (c.support_summary) {
    lines.push('## สรุปประวัติ Support')
    lines.push(c.support_summary)
    lines.push('')
  }

  if (c.notes) {
    lines.push('## หมายเหตุ')
    lines.push(c.notes)
  }

  lines.push('')
  lines.push(`---`)
  lines.push(`*อัปเดตล่าสุด: ${new Date().toLocaleDateString('th-TH')}*`)

  const content = lines.join('\n')
  const slug    = c.name.replace(/\s+/g, '-').replace(/[^\w฀-鿿-]/g, '')
  const path    = `customers/${slug}.md`

  // Store in agent_knowledge for RAG
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
    await fetch(`${appUrl}/api/knowledge/ingest`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ agent_id: 'Nam', source: `customer_${c.id}`, content }),
    })
  } catch { /* non-critical */ }

  return { path, content }
}
