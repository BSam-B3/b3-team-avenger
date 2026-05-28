'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Ticket {
  id: string; title: string; customer_name?: string
  status: string; priority: string; category: string
  assigned_to: string; created_at: string; updated_at: string
}
interface Counts { open: number; in_progress: number; resolved: number; closed: number }

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  open:        { label: '🔴 Open',        color: '#f87171', bg: 'rgba(248,113,113,0.1)'  },
  in_progress: { label: '🟡 กำลังทำ',     color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
  resolved:    { label: '🟢 แก้ไขแล้ว',   color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
  closed:      { label: '⚫ ปิด',          color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
}

const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  urgent: { label: '🔥 ด่วนมาก', color: '#ef4444' },
  high:   { label: '⚡ สูง',      color: '#f59e0b' },
  normal: { label: '📋 ปกติ',    color: '#64748b' },
  low:    { label: '🔵 ต่ำ',      color: '#3b82f6' },
}

const CATEGORIES = ['general', 'hardware', 'software', 'network', 'remote', 'other']
const CATEGORY_LABELS: Record<string, string> = {
  general: '📋 ทั่วไป', hardware: '🖥️ Hardware', software: '💿 Software',
  network: '🌐 Network', remote: '🔗 Remote', other: '❓ อื่นๆ',
}

export default function TicketsPage() {
  const [tickets,   setTickets]   = useState<Ticket[]>([])
  const [counts,    setCounts]    = useState<Counts>({ open: 0, in_progress: 0, resolved: 0, closed: 0 })
  const [filter,    setFilter]    = useState('open')
  const [loading,   setLoading]   = useState(true)
  const [showNew,   setShowNew]   = useState(false)
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [newForm,   setNewForm]   = useState({ title: '', customer_name: '', priority: 'normal', category: 'general', description: '' })
  const [saving,    setSaving]    = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/tickets?status=${filter}`).then(r => r.json())
    setTickets(res.tickets ?? [])
    setCounts(res.counts ?? {})
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = supabase.channel('tickets_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, load)
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [load])

  const createTicket = async () => {
    if (!newForm.title.trim()) return
    setSaving(true)
    await fetch('/api/tickets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    })
    setSaving(false)
    setShowNew(false)
    setNewForm({ title: '', customer_name: '', priority: 'normal', category: 'general', description: '' })
    setFilter('open')
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060b14', fontFamily: 'system-ui, sans-serif', color: '#e2e8f0' }}>
      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, height: 48, background: 'rgba(6,11,20,0.96)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', backdropFilter: 'blur(12px)' }}>
        <Link href="/room" style={{ fontSize: 11, color: '#64748b', textDecoration: 'none' }}>← Office</Link>
        <span style={{ color: '#1e293b' }}>|</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>🎫 IT Support Tickets</span>
        {counts.open > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
            🔴 {counts.open} open
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Link href="/customers" style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, color: '#64748b', textDecoration: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>👥 Customers</Link>
          <Link href="/dashboard" style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, color: '#64748b', textDecoration: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>Dashboard</Link>
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '20px 16px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
          {(Object.entries(counts) as [string, number][]).map(([s, c]) => {
            const cfg = STATUS_CFG[s]
            return (
              <button key={s} onClick={() => setFilter(s)} style={{ padding: '12px', borderRadius: 10, background: filter === s ? cfg.bg : 'rgba(255,255,255,0.02)', border: `1px solid ${filter === s ? cfg.color + '40' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: cfg.color }}>{c}</div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{cfg.label}</div>
              </button>
            )
          })}
        </div>

        {/* New ticket button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={() => setShowNew(true)} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            + เปิด Ticket ใหม่
          </button>
        </div>

        {/* New ticket form */}
        {showNew && (
          <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171', marginBottom: 12 }}>🎫 เปิด Ticket ใหม่</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: '#64748b', marginBottom: 3 }}>หัวข้อปัญหา *</div>
                <input value={newForm.title} onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="เช่น คอมพิวเตอร์ลูกค้า ABC เปิดไม่ติด"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '7px 10px', color: '#e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 9, color: '#64748b', marginBottom: 3 }}>ลูกค้า</div>
                  <input value={newForm.customer_name} onChange={e => setNewForm(p => ({ ...p, customer_name: e.target.value }))}
                    placeholder="ชื่อลูกค้า"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 8px', color: '#e2e8f0', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#64748b', marginBottom: 3 }}>ความเร่งด่วน</div>
                  <select value={newForm.priority} onChange={e => setNewForm(p => ({ ...p, priority: e.target.value }))}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 8px', color: '#e2e8f0', fontSize: 11, cursor: 'pointer' }}>
                    {Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#64748b', marginBottom: 3 }}>หมวดหมู่</div>
                  <select value={newForm.category} onChange={e => setNewForm(p => ({ ...p, category: e.target.value }))}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 8px', color: '#e2e8f0', fontSize: 11, cursor: 'pointer' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#64748b', marginBottom: 3 }}>รายละเอียด</div>
                <textarea value={newForm.description} onChange={e => setNewForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder="อธิบายปัญหาเพิ่มเติม..."
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '7px 10px', color: '#e2e8f0', fontSize: 11, outline: 'none', resize: 'none', fontFamily: 'system-ui', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={createTicket} disabled={saving} style={{ padding: '7px 18px', borderRadius: 7, background: '#dc2626', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'กำลังบันทึก...' : '🎫 เปิด Ticket'}
              </button>
              <button onClick={() => setShowNew(false)} style={{ padding: '7px 14px', borderRadius: 7, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>ยกเลิก</button>
            </div>
          </div>
        )}

        {/* Ticket list */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>กำลังโหลด...</div>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎫</div>
            <div style={{ color: '#475569', fontSize: 13 }}>ไม่มี ticket ในสถานะนี้</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {tickets.map(t => {
              const sCfg = STATUS_CFG[t.status] ?? STATUS_CFG.open
              const pCfg = PRIORITY_CFG[t.priority] ?? PRIORITY_CFG.normal
              const isOpen = expanded === t.id

              return (
                <div key={t.id} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${isOpen ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                  {/* Row */}
                  <div onClick={() => setExpanded(isOpen ? null : t.id)} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 14 }}>{CATEGORY_LABELS[t.category]?.split(' ')[0] ?? '📋'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{t.title}</div>
                      <div style={{ fontSize: 10, color: '#475569' }}>
                        {t.customer_name && <span>{t.customer_name} · </span>}
                        {new Date(t.created_at).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: pCfg.color + '18', border: `1px solid ${pCfg.color}40`, color: pCfg.color, flexShrink: 0 }}>{pCfg.label}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: sCfg.bg, border: `1px solid ${sCfg.color}40`, color: sCfg.color, flexShrink: 0 }}>{sCfg.label}</span>
                  </div>

                  {/* Actions (expanded) */}
                  {isOpen && (
                    <div style={{ padding: '0 16px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                      <div style={{ fontSize: 10, color: '#475569', marginBottom: 8 }}>เปลี่ยนสถานะ:</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {Object.entries(STATUS_CFG).filter(([s]) => s !== t.status).map(([s, cfg]) => (
                          <button key={s} onClick={() => { updateStatus(t.id, s); setExpanded(null) }} style={{ padding: '5px 12px', borderRadius: 6, background: cfg.bg, border: `1px solid ${cfg.color}40`, color: cfg.color, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                            {cfg.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
