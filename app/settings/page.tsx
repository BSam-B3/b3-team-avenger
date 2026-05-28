'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface BackendStatus {
  gemini: boolean; groq: boolean; claude: boolean; openai: boolean
  active: string; all: string[]
}
interface EmailStatus { google_client_id: boolean; microsoft_client: boolean }

const BACKEND_INFO = [
  { key: 'gemini', label: 'Gemini 2.0 Flash', cost: '$0.075/1M', color: '#4ade80', envKey: 'GEMINI_API_KEY' },
  { key: 'groq',   label: 'Groq Llama 3.3 70B', cost: '$0.59/1M', color: '#f59e0b', envKey: 'GROQ_API_KEY' },
  { key: 'claude', label: 'Claude Haiku 4.5',  cost: '$0.80/1M', color: '#a855f7', envKey: 'ANTHROPIC_API_KEY' },
  { key: 'openai', label: 'GPT-4o Mini',       cost: '$0.15/1M', color: '#60a5fa', envKey: 'OPENAI_API_KEY' },
]

export default function SettingsPage() {
  const [backends,  setBackends]  = useState<BackendStatus | null>(null)
  const [email,     setEmail]     = useState<EmailStatus | null>(null)
  const [settings,  setSettings]  = useState<Record<string,unknown>>({})
  const [loading,   setLoading]   = useState(true)
  const [saved,     setSaved]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setBackends(d.backendStatus)
      setEmail(d.emailStatus)
      setSettings(d.settings ?? {})
      setLoading(false)
    })
  }, [])

  const save = async (key: string, value: unknown) => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    setSettings(p => ({ ...p, [key]: value }))
    setSaved(key)
    setTimeout(() => setSaved(null), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#f0f6fc' }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,17,23,0.95)', borderBottom: '1px solid #30363d',
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 44,
      }}>
        <div style={{ width:28, height:28, borderRadius:6, background:'linear-gradient(135deg,#7c3aed,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#fff' }}>B3</div>
        <div style={{ fontSize:9, fontWeight:900, letterSpacing:2, color:'#f0f6fc' }}>TEAM AVENGER</div>
        <div style={{ width:1, height:18, background:'#30363d', margin:'0 4px' }} />
        <span style={{ fontSize:11, fontWeight:700, color:'#94a3b8' }}>⚙️ SETTINGS</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {[{label:'DASHBOARD',href:'/dashboard',color:'#60a5fa'},{label:'ANALYTICS',href:'/analytics',color:'#a855f7'},{label:'TEAM',href:'/team',color:'#34d399'}].map(l => (
            <Link key={l.href} href={l.href} style={{ padding:'3px 10px', borderRadius:5, fontSize:9, fontWeight:700, background:`${l.color}18`, border:`1px solid ${l.color}33`, color:l.color, textDecoration:'none' }}>{l.label}</Link>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px', maxWidth:800, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>
        {loading ? <div style={{ color:'#4b5563', padding:60, textAlign:'center' }}>กำลังโหลด...</div> : (<>

          {/* AI Backends */}
          <Section title="🤖 AI BACKENDS" subtitle={`Active: ${backends?.active?.toUpperCase() ?? '—'}`}>
            {BACKEND_INFO.map(b => {
              const on = backends?.[b.key as keyof BackendStatus] as boolean
              return (
                <div key={b.key} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #21262d' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background: on ? b.color : '#374151', boxShadow: on ? `0 0 8px ${b.color}` : 'none' }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color: on ? '#f0f6fc' : '#4b5563' }}>{b.label}</div>
                    <div style={{ fontSize:9, color:'#4b5563' }}>{b.envKey} — {b.cost} input</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {backends?.active === b.key && (
                      <span style={{ fontSize:9, fontWeight:700, color:b.color, padding:'2px 8px', background:`${b.color}18`, borderRadius:20, border:`1px solid ${b.color}44` }}>ACTIVE</span>
                    )}
                    <span style={{ fontSize:10, fontWeight:700, color: on ? '#22c55e' : '#f87171' }}>{on ? '✓ Set' : '✗ Missing'}</span>
                  </div>
                </div>
              )
            })}
            <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(96,165,250,0.06)', border:'1px solid rgba(96,165,250,0.2)', borderRadius:6, fontSize:10, color:'#60a5fa' }}>
              💡 เพิ่ม/เปลี่ยน API Key ได้ที่ <strong>Vercel → Project → Settings → Environment Variables</strong>
            </div>
          </Section>

          {/* Email Integration */}
          <Section title="📧 EMAIL INTEGRATION">
            {[
              { label:'Gmail (Google OAuth)', on: email?.google_client_id, href:'/auth' },
              { label:'Microsoft 365', on: email?.microsoft_client, href:'/auth' },
            ].map(e => (
              <div key={e.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom:'1px solid #21262d' }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background: e.on ? '#22c55e' : '#374151' }} />
                <span style={{ flex:1, fontSize:11, color: e.on ? '#f0f6fc' : '#4b5563' }}>{e.label}</span>
                <Link href={e.href} style={{ fontSize:9, color:'#60a5fa', textDecoration:'none' }}>
                  {e.on ? 'Reconnect →' : 'Connect →'}
                </Link>
              </div>
            ))}
          </Section>

          {/* Telegram */}
          <Section title="📨 TELEGRAM NOTIFICATIONS" subtitle="สำหรับ Idle-time Autonomy และ Exploiter alerts">
            <SettingField label="Bot Token" settingKey="b3_telegram_token"
              value={String(settings['b3_telegram_token'] ?? '')} onSave={save} saved={saved} type="password"
              placeholder="110201543:AAHdqTcvCH1vGWJxfSeofSs4tGeahe..." />
            <SettingField label="Chat ID" settingKey="b3_telegram_chat_id"
              value={String(settings['b3_telegram_chat_id'] ?? '')} onSave={save} saved={saved}
              placeholder="-100123456789" />
            <div style={{ fontSize:10, color:'#4b5563', marginTop:8, lineHeight:1.7 }}>
              สร้าง Bot: <span style={{ color:'#60a5fa' }}>@BotFather</span> → /newbot → copy token<br/>
              หา Chat ID: <span style={{ color:'#60a5fa' }}>@userinfobot</span> → /start
            </div>
          </Section>

          {/* Behavior */}
          <Section title="⚡ AGENT BEHAVIOR">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #21262d' }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'#f0f6fc' }}>Web Search</div>
                <div style={{ fontSize:9, color:'#4b5563' }}>ค้น web อัตโนมัติเมื่อ context ไม่พอ</div>
              </div>
              <Toggle value={settings['b3_search_enabled'] !== false && settings['b3_search_enabled'] !== 'false'}
                onChange={v => save('b3_search_enabled', v)} />
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #21262d' }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'#f0f6fc' }}>Idle Autonomy (ชั่วโมง)</div>
                <div style={{ fontSize:9, color:'#4b5563' }}>เปิด autonomy mode หลังจากไม่มีคำสั่งนาน</div>
              </div>
              <select
                value={String(settings['b3_idle_hours'] ?? 3)}
                onChange={e => save('b3_idle_hours', Number(e.target.value))}
                style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:6, padding:'4px 8px', color:'#f0f6fc', fontSize:11, cursor:'pointer' }}>
                {[1,2,3,6,12,24].map(h => <option key={h} value={h}>{h} ชั่วโมง</option>)}
              </select>
            </div>
          </Section>

        </>)}
      </div>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:10, overflow:'hidden' }}>
      <div style={{ padding:'12px 20px', borderBottom:'1px solid #30363d', background:'#0d1117', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'#8b949e', letterSpacing:1 }}>{title}</span>
        {subtitle && <span style={{ fontSize:9, color:'#4b5563' }}>{subtitle}</span>}
      </div>
      <div style={{ padding:'8px 20px 16px' }}>{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width:40, height:22, borderRadius:11, cursor:'pointer', border:'none', transition:'all 0.2s',
      background: value ? '#22c55e' : '#374151', position:'relative',
    }}>
      <div style={{
        position:'absolute', top:3, transition:'left 0.2s',
        left: value ? 21 : 3, width:16, height:16, borderRadius:'50%', background:'#fff',
      }} />
    </button>
  )
}

function SettingField({ label, settingKey, value, onSave, saved, type = 'text', placeholder }: {
  label: string; settingKey: string; value: string
  onSave: (key:string, val:string) => void; saved: string|null
  type?: string; placeholder?: string
}) {
  const [v, setV] = useState(value)
  const isDirty = v !== value
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #21262d' }}>
      <span style={{ fontSize:10, color:'#8b949e', width:90, flexShrink:0 }}>{label}</span>
      <input type={type} value={v} onChange={e => setV(e.target.value)} placeholder={placeholder}
        style={{ flex:1, background:'#0d1117', border:'1px solid #30363d', borderRadius:6, padding:'5px 10px', color:'#f0f6fc', fontSize:11, outline:'none' }} />
      <button onClick={() => onSave(settingKey, v)} style={{
        padding:'4px 12px', borderRadius:6, fontSize:9, fontWeight:700, cursor:'pointer',
        background: saved === settingKey ? 'rgba(34,197,94,0.15)' : isDirty ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${saved === settingKey ? 'rgba(34,197,94,0.4)' : isDirty ? 'rgba(96,165,250,0.4)' : '#30363d'}`,
        color: saved === settingKey ? '#4ade80' : isDirty ? '#60a5fa' : '#4b5563',
      }}>{saved === settingKey ? '✓ บันทึกแล้ว' : 'บันทึก'}</button>
    </div>
  )
}
