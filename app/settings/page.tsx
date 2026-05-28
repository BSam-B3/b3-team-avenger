'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Connections {
  gmail: { connected: boolean; email: string }
  m365:  { connected: boolean; email: string }
  cit:   { connected: boolean; email: string }
  gcal:  { connected: boolean; email: string }
}
interface BackendStatus {
  gemini: boolean; groq: boolean; claude: boolean; openai: boolean
  active: string
}

// ─── ข้อมูล backend ──────────────────────────────────────────────────────────

const BACKENDS = [
  {
    key: 'groq', label: 'Groq Llama 3.3 70B', color: '#10b981',
    badge: 'FREE', badgeColor: '#10b981',
    quota: '14,400 req/วัน ฟรี', envKey: 'GROQ_API_KEY',
    tip: 'แนะนำ — ฟรี เร็ว ดี',
  },
  {
    key: 'gemini', label: 'Gemini 2.0 Flash', color: '#3b82f6',
    badge: 'FREE', badgeColor: '#3b82f6',
    quota: '1,500 req/วัน ฟรี', envKey: 'GEMINI_API_KEY',
    tip: 'Fallback จาก Groq',
  },
  {
    key: 'claude', label: 'Claude Haiku 4.5', color: '#a855f7',
    badge: 'PAID', badgeColor: '#f59e0b',
    quota: '$0.80/1M tokens', envKey: 'ANTHROPIC_API_KEY',
    tip: 'คุณภาพสูงสุด มีค่าใช้จ่าย',
  },
  {
    key: 'openai', label: 'GPT-4o Mini', color: '#60a5fa',
    badge: 'PAID', badgeColor: '#f59e0b',
    quota: '$0.15/1M tokens', envKey: 'OPENAI_API_KEY',
    tip: 'Optional',
  },
]

// ─── ข้อมูล integrations ──────────────────────────────────────────────────────

const EMAIL_ACCOUNTS = [
  {
    key: 'gmail', label: 'Gmail', desc: 'ส่วนตัว — ธนาคาร โปรโมชั่น',
    icon: '📧', color: '#ea4335', authPath: '/api/auth/gmail',
  },
  {
    key: 'm365', label: 'PANDV (Microsoft 365)', desc: 'บริษัท P AND V HAPPYNESS',
    icon: '🏢', color: '#0078d4', authPath: '/api/auth/m365',
  },
  {
    key: 'cit', label: 'CIT (C.I.T. Computer)', desc: 'ที่ทำงาน C.I.T.',
    icon: '💼', color: '#6366f1', authPath: '/api/auth/cit',
  },
]

export default function SettingsPage() {
  const [backends,    setBackends]    = useState<BackendStatus | null>(null)
  const [connections, setConnections] = useState<Connections | null>(null)
  const [settings,    setSettings]    = useState<Record<string, unknown>>({})
  const [loading,     setLoading]     = useState(true)
  const [saved,       setSaved]       = useState<string | null>(null)

  // Handle OAuth callback success/error
  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams(window.location.search)
    const success = p.get('success')
    if (success) {
      const labels: Record<string, string> = {
        gmail: 'Gmail', m365: 'PANDV', cit: 'CIT', gcal: 'Google Calendar'
      }
      setSaved(`✓ เชื่อมต่อ ${labels[success] ?? success} สำเร็จแล้วค่ะ`)
      setTimeout(() => setSaved(null), 4000)
      window.history.replaceState({}, '', '/settings')
    }
  }, [])

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setBackends(d.backendStatus)
      setConnections(d.connections ?? null)
      setSettings(d.settings ?? {})
      setLoading(false)
    })
  }, [])

  const saveSetting = async (key: string, value: unknown) => {
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    setSettings(p => ({ ...p, [key]: value }))
    setSaved(`บันทึก ${key} แล้ว`)
    setTimeout(() => setSaved(null), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060b14', fontFamily: 'system-ui, sans-serif', color: '#e2e8f0' }}>

      {/* ── Top bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50, height: 48,
        background: 'rgba(6,11,20,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#fff' }}>B3</div>
        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 2, color: '#64748b' }}>TEAM AVENGER</span>
        <div style={{ width: 1, height: 18, background: '#1e293b' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>⚙️ Settings</span>

        {saved && (
          <span style={{ fontSize: 11, color: '#4ade80', background: 'rgba(34,197,94,0.1)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.2)', marginLeft: 8 }}>
            {saved}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {[
            { label: '← Office', href: '/room' },
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Team', href: '/team' },
          ].map(l => (
            <Link key={l.href} href={l.href} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, color: '#64748b', textDecoration: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>{l.label}</Link>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#475569', padding: 60, fontSize: 14 }}>กำลังโหลด...</div>
        ) : (<>

          {/* ── EMAIL ACCOUNTS ── */}
          <Card title="📧 Email Accounts" subtitle="เชื่อมต่อเพื่อให้ Janie อ่านและจัดการ email ได้">
            {EMAIL_ACCOUNTS.map(acc => {
              const conn = connections?.[acc.key as keyof Connections]
              return (
                <ConnectRow
                  key={acc.key}
                  icon={acc.icon}
                  label={acc.label}
                  desc={conn?.connected && conn.email ? conn.email : acc.desc}
                  color={acc.color}
                  connected={conn?.connected ?? false}
                  authPath={acc.authPath}
                />
              )
            })}
          </Card>

          {/* ── GOOGLE CALENDAR ── */}
          <Card title="📅 Google Calendar" subtitle="Janie สร้าง/แก้นัดใน Calendar ได้โดยตรง → sync มือถือทันที">
            <ConnectRow
              icon="📅"
              label="Google Calendar"
              desc={connections?.gcal.connected && connections.gcal.email
                ? connections.gcal.email
                : 'เชื่อมต่อเพื่อสร้างนัดด้วยเสียง เช่น "นัดกินข้าวพรุ่งนี้ 10 โมง"'}
              color="#4285f4"
              connected={connections?.gcal.connected ?? false}
              authPath="/api/auth/gcal"
            />
            {!connections?.gcal.connected && (
              <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(66,133,244,0.06)', border: '1px solid rgba(66,133,244,0.2)', borderRadius: 8, fontSize: 11, color: '#93c5fd', lineHeight: 1.7 }}>
                💡 หลังเชื่อมต่อแล้ว พิมพ์ใน chat:<br />
                <strong style={{ color: '#bfdbfe' }}>"เจนนี่ นัดกินข้าวพรุ่งนี้ 10 โมง แจ้งเตือนก่อน 1 ชั่วโมง"</strong><br />
                Event จะขึ้น Google Calendar และ sync มือถือทันที
              </div>
            )}
          </Card>

          {/* ── AI BACKENDS ── */}
          <Card title="🤖 AI Backends" subtitle={`Active: ${backends?.active?.toUpperCase() ?? '—'} — ระบบ fallback อัตโนมัติ Groq → Gemini → Claude`}>
            {BACKENDS.map(b => {
              const on = backends?.[b.key as keyof BackendStatus] as boolean
              const isActive = backends?.active === b.key
              return (
                <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: on ? b.color : '#1e293b', boxShadow: on ? `0 0 8px ${b.color}60` : 'none' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: on ? '#e2e8f0' : '#475569' }}>{b.label}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: `${b.badgeColor}18`, border: `1px solid ${b.badgeColor}40`, color: b.badgeColor }}>{b.badge}</span>
                      {isActive && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: `${b.color}20`, border: `1px solid ${b.color}50`, color: b.color }}>● ACTIVE</span>}
                    </div>
                    <div style={{ fontSize: 10, color: '#475569' }}>{b.quota} · {b.tip}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: on ? '#22c55e' : '#ef4444' }}>{on ? '✓ Set' : '✗ Missing'}</span>
                </div>
              )
            })}
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, fontSize: 10, color: '#818cf8' }}>
              💡 เพิ่ม API Key ที่ <strong>Vercel → b3-team-avenger → Settings → Environment Variables</strong>
            </div>
          </Card>

          {/* ── TELEGRAM ── */}
          <Card title="📨 Telegram Notifications" subtitle="แจ้งเตือนผ่านมือถือ — Idle autonomy, Calendar, Approvals">
            <SettingRow label="Bot Token" settingKey="b3_telegram_token"
              value={String(settings['b3_telegram_token'] ?? '')} onSave={saveSetting} saved={saved} type="password"
              placeholder="110201543:AAHdqTcvCH1vGWJxfSeofSs4tGeahe..." />
            <SettingRow label="Chat ID" settingKey="b3_telegram_chat_id"
              value={String(settings['b3_telegram_chat_id'] ?? '')} onSave={saveSetting} saved={saved}
              placeholder="-100123456789" />
            <div style={{ marginTop: 8, fontSize: 10, color: '#475569', lineHeight: 1.8 }}>
              1. ไปที่ Telegram → ค้นหา <span style={{ color: '#60a5fa' }}>@BotFather</span> → พิมพ์ /newbot → copy token<br />
              2. หา Chat ID: ไปที่ <span style={{ color: '#60a5fa' }}>@userinfobot</span> → พิมพ์ /start → copy ID
            </div>
          </Card>

          {/* ── SUPPORT LINK ── */}
          <Card title="🎫 Customer Support Link" subtitle="ลิงก์ให้ลูกค้าส่ง ticket โดยตรง — ไม่ต้อง login">
            <div style={{ padding: '12px 0' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>ส่งลิงก์นี้ให้ลูกค้าเปิดแบบฟอร์มแจ้งปัญหา:</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '8px 12px', fontSize: 12, color: '#818cf8', wordBreak: 'break-all' }}>
                  https://b3-team-avenger.vercel.app/support
                </code>
                <a href="/support" target="_blank" style={{ padding: '8px 14px', borderRadius: 7, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontSize: 11, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
                  เปิดดู →
                </a>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: '#334155' }}>
                ลูกค้ากรอกชื่อ บริษัท เบอร์โทร ประเภทปัญหา → ticket เข้าระบบอัตโนมัติที่ /tickets
              </div>
            </div>
          </Card>

          {/* ── AGENT BEHAVIOR ── */}
          <Card title="⚡ Agent Behavior">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>Web Search</div>
                <div style={{ fontSize: 10, color: '#475569' }}>ค้น web อัตโนมัติเมื่อ context ไม่พอ</div>
              </div>
              <Toggle value={settings['b3_search_enabled'] !== false && settings['b3_search_enabled'] !== 'false'}
                onChange={v => saveSetting('b3_search_enabled', v)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>Idle Autonomy</div>
                <div style={{ fontSize: 10, color: '#475569' }}>เปิด autonomy mode หลังไม่มีคำสั่งนาน</div>
              </div>
              <select
                value={String(settings['b3_idle_hours'] ?? 3)}
                onChange={e => saveSetting('b3_idle_hours', Number(e.target.value))}
                style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 10px', color: '#e2e8f0', fontSize: 11, cursor: 'pointer' }}>
                {[1, 2, 3, 6, 12, 24].map(h => <option key={h} value={h}>{h} ชั่วโมง</option>)}
              </select>
            </div>
          </Card>

        </>)}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ padding: '8px 20px 16px' }}>{children}</div>
    </div>
  )
}

function ConnectRow({ icon, label, desc, color, connected, authPath }: {
  icon: string; label: string; desc: string; color: string
  connected: boolean; authPath: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: connected ? '#e2e8f0' : '#64748b', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 10, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{desc}</div>
      </div>
      <a
        href={authPath}
        style={{
          padding: '7px 16px', borderRadius: 8, fontSize: 11, fontWeight: 600,
          background: connected ? 'rgba(34,197,94,0.1)' : `${color}18`,
          border: `1px solid ${connected ? 'rgba(34,197,94,0.3)' : `${color}40`}`,
          color: connected ? '#4ade80' : color,
          textDecoration: 'none', flexShrink: 0, transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        {connected ? '✓ Connected' : '+ Connect'}
      </a>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, cursor: 'pointer', border: 'none',
      background: value ? '#22c55e' : '#1e293b', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{ position: 'absolute', top: 4, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: value ? 24 : 4 }} />
    </button>
  )
}

function SettingRow({ label, settingKey, value, onSave, saved, type = 'text', placeholder }: {
  label: string; settingKey: string; value: string
  onSave: (k: string, v: string) => void; saved: string | null
  type?: string; placeholder?: string
}) {
  const [v, setV] = useState(value)
  useEffect(() => { setV(value) }, [value])
  const isSaved = saved?.includes(settingKey)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 11, color: '#64748b', width: 80, flexShrink: 0 }}>{label}</span>
      <input
        type={type} value={v} onChange={e => setV(e.target.value)} placeholder={placeholder}
        style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '6px 10px', color: '#e2e8f0', fontSize: 11, outline: 'none', fontFamily: 'system-ui' }}
      />
      <button
        onClick={() => onSave(settingKey, v)}
        style={{
          padding: '6px 14px', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer',
          background: isSaved ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
          border: `1px solid ${isSaved ? 'rgba(34,197,94,0.4)' : 'rgba(99,102,241,0.4)'}`,
          color: isSaved ? '#4ade80' : '#818cf8', transition: 'all 0.2s',
        }}
      >{isSaved ? '✓ บันทึกแล้ว' : 'บันทึก'}</button>
    </div>
  )
}
