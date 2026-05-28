'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Customer {
  id: string; name: string; nickname?: string; company?: string
  department?: string; phone?: string; email?: string
  tags: string[]; updated_at: string
}
interface Update {
  id: string; customer_id?: string; customer_name?: string
  field: string; old_value?: string; new_value: string
  reason?: string; source_agent: string; source_context?: string
  status: string; created_at: string
  customers?: { name: string; company?: string }
}

const FIELD_LABELS: Record<string, string> = {
  name: 'ชื่อ', nickname: 'ชื่อเล่น', company: 'บริษัท', department: 'แผนก',
  phone: 'เบอร์โทร', email: 'Email', line_id: 'Line ID', notes: 'หมายเหตุ',
  device: 'อุปกรณ์', new_customer: 'ลูกค้าใหม่',
}

export default function CustomersPage() {
  const [customers,  setCustomers]  = useState<Customer[]>([])
  const [updates,    setUpdates]    = useState<Update[]>([])
  const [search,     setSearch]     = useState('')
  const [selected,   setSelected]   = useState<Customer | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [showNew,    setShowNew]    = useState(false)
  const [newForm,    setNewForm]    = useState({ name: '', nickname: '', company: '', department: '', phone: '', email: '' })
  const [saving,     setSaving]     = useState(false)
  const [tab,        setTab]        = useState<'list' | 'updates'>('list')

  const load = useCallback(async () => {
    setLoading(true)
    const [custRes, updRes] = await Promise.all([
      fetch(`/api/customers${search ? `?q=${encodeURIComponent(search)}` : ''}`).then(r => r.json()),
      fetch('/api/customers/updates').then(r => r.json()),
    ])
    setCustomers(custRes.customers ?? [])
    setUpdates(updRes.updates ?? [])
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  // Realtime: auto-reload when new update arrives
  useEffect(() => {
    const ch = supabase.channel('customers_page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'customer_updates' }, load)
      .on('postgres_changes', { event: 'UPDATE',  schema: 'public', table: 'customers' },        load)
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [load])

  const handleUpdateAction = async (id: string, action: 'approve' | 'reject') => {
    await fetch('/api/customers/updates', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    load()
  }

  const handleAddCustomer = async () => {
    if (!newForm.name.trim()) return
    setSaving(true)
    await fetch('/api/customers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    })
    setSaving(false)
    setShowNew(false)
    setNewForm({ name: '', nickname: '', company: '', department: '', phone: '', email: '' })
    load()
  }

  const pendingCount = updates.filter(u => u.status === 'pending').length

  return (
    <div style={{ minHeight: '100vh', background: '#060b14', fontFamily: 'system-ui, sans-serif', color: '#e2e8f0' }}>
      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, height: 48, background: 'rgba(6,11,20,0.96)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', backdropFilter: 'blur(12px)' }}>
        <Link href="/room" style={{ fontSize: 11, color: '#64748b', textDecoration: 'none' }}>← Office</Link>
        <span style={{ color: '#1e293b' }}>|</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>👥 Customer Intelligence</span>
        {pendingCount > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
            ● {pendingCount} รออนุมัติ
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Link href="/dashboard" style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, color: '#64748b', textDecoration: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>Dashboard</Link>
          <Link href="/tickets" style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, color: '#64748b', textDecoration: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>🎫 Tickets</Link>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
          {([['list', '👥 รายชื่อลูกค้า'], ['updates', `🔔 อัปเดตรออนุมัติ${pendingCount > 0 ? ` (${pendingCount})` : ''}`]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: '8px 12px', borderRadius: 7, border: 'none', background: tab === key ? 'rgba(99,102,241,0.2)' : 'transparent', color: tab === key ? '#818cf8' : '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: tab === key ? '1px solid rgba(99,102,241,0.3)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── CUSTOMER LIST TAB ── */}
        {tab === 'list' && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ บริษัท เบอร์โทร..."
                style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none' }}
              />
              <button onClick={() => setShowNew(true)} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                + เพิ่มลูกค้า
              </button>
            </div>

            {/* Add customer form */}
            {showNew && (
              <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', marginBottom: 12 }}>➕ เพิ่มลูกค้าใหม่</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {([['name', 'ชื่อ *'], ['nickname', 'ชื่อเล่น'], ['company', 'บริษัท'], ['department', 'แผนก'], ['phone', 'เบอร์โทร'], ['email', 'Email']] as const).map(([key, label]) => (
                    <div key={key}>
                      <div style={{ fontSize: 9, color: '#64748b', marginBottom: 3 }}>{label}</div>
                      <input
                        value={newForm[key as keyof typeof newForm]}
                        onChange={e => setNewForm(p => ({ ...p, [key]: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 8px', color: '#e2e8f0', fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={handleAddCustomer} disabled={saving} style={{ padding: '7px 18px', borderRadius: 7, background: '#4f46e5', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                  <button onClick={() => setShowNew(false)} style={{ padding: '7px 14px', borderRadius: 7, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>ยกเลิก</button>
                </div>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>กำลังโหลด...</div>
            ) : customers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                <div style={{ color: '#475569', fontSize: 13 }}>ยังไม่มีข้อมูลลูกค้า</div>
                <div style={{ color: '#334155', fontSize: 11, marginTop: 4 }}>เพิ่มลูกค้าใหม่ หรือสั่ง Janie: "บันทึกข้อมูลลูกค้าคุณ X"</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {customers.map(c => (
                  <div key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)}
                    style={{ background: selected?.id === c.id ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${selected?.id === c.id ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, padding: '12px 16px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                        {c.name.slice(0, 1)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
                          {c.name} {c.nickname && <span style={{ fontSize: 11, color: '#818cf8' }}>({c.nickname})</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {[c.company, c.department].filter(Boolean).join(' · ')}
                          {c.phone && <span style={{ marginLeft: 8, color: '#475569' }}>📞 {c.phone}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: 9, color: '#334155' }}>
                        {new Date(c.updated_at).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {selected?.id === c.id && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {[['เบอร์', c.phone], ['Email', c.email], ['บริษัท', c.company], ['แผนก', c.department]].filter(([, v]) => v).map(([label, val]) => (
                          <div key={label}>
                            <div style={{ fontSize: 9, color: '#475569' }}>{label}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{val}</div>
                          </div>
                        ))}
                        {c.tags.length > 0 && (
                          <div style={{ gridColumn: '1/-1', display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                            {c.tags.map(tag => (
                              <span key={tag} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── UPDATES APPROVAL TAB ── */}
        {tab === 'updates' && (
          <div>
            {updates.filter(u => u.status === 'pending').length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ color: '#475569', fontSize: 13 }}>ไม่มี update รออนุมัติ</div>
                <div style={{ color: '#334155', fontSize: 11, marginTop: 4 }}>เมื่อ agents เรียนรู้ข้อมูลลูกค้าใหม่ จะมาปรากฏที่นี่</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {updates.filter(u => u.status === 'pending').map(upd => (
                  <div key={upd.id} style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>
                        {upd.customers?.name ?? upd.customer_name ?? 'ลูกค้าใหม่'}
                      </div>
                      {upd.customers?.company && <span style={{ fontSize: 10, color: '#475569' }}>{upd.customers.company}</span>}
                      <span style={{ marginLeft: 'auto', fontSize: 9, color: '#475569' }}>
                        by {upd.source_agent} · {new Date(upd.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Proposed change */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 7, padding: '10px 12px', marginBottom: 10 }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>
                        อัปเดต <span style={{ color: '#f59e0b' }}>{FIELD_LABELS[upd.field] ?? upd.field}</span>
                      </div>
                      {upd.old_value && (
                        <div style={{ fontSize: 11, color: '#475569', textDecoration: 'line-through', marginBottom: 2 }}>ค่าเดิม: {upd.old_value}</div>
                      )}
                      <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>
                        {upd.field === 'new_customer' ? (
                          (() => {
                            try {
                              const p = JSON.parse(upd.new_value)
                              return `ลูกค้าใหม่: ${p.name}${p.company ? ` (${p.company})` : ''}${p.phone ? ` · ${p.phone}` : ''}`
                            } catch { return upd.new_value }
                          })()
                        ) : upd.new_value}
                      </div>
                      {upd.reason && <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>เหตุผล: {upd.reason}</div>}
                      {upd.source_context && <div style={{ fontSize: 9, color: '#334155', marginTop: 4, fontStyle: 'italic' }}>"{upd.source_context.slice(0, 120)}..."</div>}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleUpdateAction(upd.id, 'approve')} style={{ padding: '7px 18px', borderRadius: 7, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        ✓ อนุมัติ
                      </button>
                      <button onClick={() => handleUpdateAction(upd.id, 'reject')} style={{ padding: '7px 14px', borderRadius: 7, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 11, cursor: 'pointer' }}>
                        ✗ ปฏิเสธ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
