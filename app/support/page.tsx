'use client'

/**
 * /support — หน้าแจ้งปัญหาสำหรับลูกค้า C.I.T. Computer
 * Public page — ลูกค้าเปิดได้โดยไม่ต้อง login
 */

import { useState } from 'react'

const CATEGORIES = [
  { value: 'hardware',  label: '🖥️ Hardware — จอ เครื่อง อุปกรณ์' },
  { value: 'software',  label: '💿 Software — โปรแกรม Windows' },
  { value: 'network',   label: '🌐 Network — อินเทอร์เน็ต Wifi VPN' },
  { value: 'remote',    label: '🔗 Remote Support — เข้าควบคุมระยะไกล' },
  { value: 'printer',   label: '🖨️ Printer / Scanner' },
  { value: 'email',     label: '📧 Email — Outlook ส่งเมลไม่ได้' },
  { value: 'other',     label: '❓ อื่นๆ' },
]

const PRIORITIES = [
  { value: 'urgent', label: '🔥 ด่วนมาก — ใช้งานไม่ได้เลย',    color: '#ef4444' },
  { value: 'high',   label: '⚡ สูง — กระทบงาน',                 color: '#f59e0b' },
  { value: 'normal', label: '📋 ปกติ — ขัดข้องแต่ยังทำงานได้',  color: '#64748b' },
  { value: 'low',    label: '🔵 ต่ำ — ปรึกษา / สอบถาม',         color: '#3b82f6' },
]

export default function SupportPage() {
  const [form, setForm] = useState({
    name: '', company: '', phone: '', email: '',
    category: 'hardware', priority: 'normal', description: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState<string | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const submit = async () => {
    if (!form.name.trim() || !form.description.trim()) {
      setError('กรุณากรอกชื่อและรายละเอียดปัญหา')
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      const title = `[${form.company || form.name}] ${form.description.slice(0, 80)}`
      const res = await fetch('/api/tickets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description:   `ผู้แจ้ง: ${form.name}${form.company ? ` (${form.company})` : ''}\nโทร: ${form.phone}\nEmail: ${form.email}\n\n${form.description}`,
          customer_name: form.name,
          priority:      form.priority,
          category:      form.category,
          source:        'customer',
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setDone(data.id)
      } else {
        setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      }
    } catch {
      setError('ไม่สามารถส่งข้อมูลได้ กรุณาลองใหม่')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 480, width: '100%', background: '#fff', borderRadius: 16, padding: '40px 32px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>ส่งคำขอสำเร็จแล้ว</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>
            ทีม C.I.T. Computer ได้รับแจ้งปัญหาของคุณแล้ว<br />
            เจ้าหน้าที่จะติดต่อกลับโดยเร็วที่สุด
          </p>
          <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#475569' }}>
            Ticket ID: <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{done.slice(0, 8).toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => { setDone(null); setForm({ name: '', company: '', phone: '', email: '', category: 'hardware', priority: 'normal', description: '' }) }}
              style={{ padding: '10px 20px', borderRadius: 8, background: '#0f172a', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              แจ้งปัญหาเพิ่มเติม
            </button>
            <a href="tel:+66949960604" style={{ padding: '10px 20px', borderRadius: 8, background: '#f1f5f9', color: '#0f172a', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
              📞 โทรหาเรา
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#0f172a', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
          💻
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>C.I.T. Computer</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>IT Support Center</div>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 20px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>แจ้งปัญหาคอมพิวเตอร์</h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px' }}>กรอกข้อมูลด้านล่าง เจ้าหน้าที่จะติดต่อกลับโดยเร็ว</p>

        {/* Contact info */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>ข้อมูลผู้แจ้ง</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {([['name', 'ชื่อ-นามสกุล *', 'สมชาย ใจดี', false], ['company', 'บริษัท / องค์กร', 'บริษัท ABC จำกัด', false], ['phone', 'เบอร์โทรศัพท์', '081-234-5678', false], ['email', 'Email', 'somchai@abc.com', false]] as const).map(([k, label, ph]) => (
              <div key={k}>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{label}</div>
                <input
                  value={form[k as keyof typeof form]}
                  onChange={e => set(k, e.target.value)}
                  placeholder={ph}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 10px', fontSize: 13, outline: 'none', color: '#0f172a', boxSizing: 'border-box', background: '#f8fafc' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Problem type */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>ประเภทปัญหา</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => set('category', c.value)} style={{ padding: '10px 12px', borderRadius: 8, border: `2px solid ${form.category === c.value ? '#3b82f6' : '#e2e8f0'}`, background: form.category === c.value ? '#eff6ff' : '#f8fafc', color: form.category === c.value ? '#1d4ed8' : '#475569', fontSize: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontWeight: form.category === c.value ? 600 : 400 }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>ความเร่งด่วน</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {PRIORITIES.map(p => (
              <button key={p.value} onClick={() => set('priority', p.value)} style={{ padding: '10px 14px', borderRadius: 8, border: `2px solid ${form.priority === p.value ? p.color : '#e2e8f0'}`, background: form.priority === p.value ? p.color + '10' : '#f8fafc', color: form.priority === p.value ? p.color : '#475569', fontSize: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontWeight: form.priority === p.value ? 600 : 400 }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>อธิบายปัญหา *</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>ยิ่งละเอียดยิ่งช่วยให้เราแก้ไขได้เร็วขึ้น</div>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={4}
            placeholder="เช่น เปิดเครื่องมาหน้าจอดำ มีข้อความ error ว่า... หรือ โปรแกรม Excel เปิดไม่ได้หลังจาก update Windows..."
            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 7, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'vertical', color: '#0f172a', lineHeight: 1.6, fontFamily: 'system-ui', background: '#f8fafc', boxSizing: 'border-box' }}
          />
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#dc2626' }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={submit} disabled={submitting} style={{ width: '100%', padding: '14px', borderRadius: 10, background: submitting ? '#94a3b8' : '#0f172a', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
          {submitting ? '⏳ กำลังส่ง...' : '📤 ส่งคำขอ Support'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#94a3b8' }}>
          โทรด่วน: <a href="tel:+66949960604" style={{ color: '#3b82f6', textDecoration: 'none' }}>094-996-0604</a>
        </div>
      </div>
    </div>
  )
}
