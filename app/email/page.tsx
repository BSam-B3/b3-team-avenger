'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface EmailMessage {
  id:       string
  provider: 'gmail' | 'm365' | 'cit'
  from:     string
  subject:  string
  date:     string
  snippet:  string
  isRead:   boolean
}

interface EmailStatus {
  gmail: { connected: boolean; email?: string }
  m365:  { connected: boolean; email?: string }
  cit:   { connected: boolean; email?: string }
}

type Tab = 'gmail' | 'm365' | 'cit'

const TAB_CONFIG: Record<Tab, {
  label: string; alias: string; purpose: string
  icon: string; color: string; authPath: string
}> = {
  gmail: {
    label:    'Gmail',
    alias:    'ส่วนตัว',
    purpose:  'ธนาคาร · โปรโมชั่น · งานส่วนตัว',
    icon:     '📧',
    color:    '#ea4335',
    authPath: '/api/auth/gmail',
  },
  m365: {
    label:    'PANDV',
    alias:    'บริษัท',
    purpose:  'P AND V HAPPYNESS',
    icon:     '🏢',
    color:    '#0078d4',
    authPath: '/api/auth/m365',
  },
  cit: {
    label:    'CIT',
    alias:    'ที่ทำงาน',
    purpose:  'C.I.T.',
    icon:     '💼',
    color:    '#6366f1',
    authPath: '/api/auth/cit',
  },
}

function EmailCard({ email, onReply }: { email: EmailMessage; onReply: (e: EmailMessage) => void }) {
  const cfg = TAB_CONFIG[email.provider] ?? TAB_CONFIG.gmail
  const dateStr = (() => {
    try {
      return new Date(email.date).toLocaleString('th-TH', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    } catch { return email.date }
  })()

  return (
    <div style={{
      padding:      '14px 16px',
      borderRadius: 10,
      background:   email.isRead ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
      border:       `1px solid ${email.isRead ? 'rgba(255,255,255,0.06)' : `${cfg.color}30`}`,
      marginBottom: 8,
      transition:   'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Unread dot */}
        <div style={{
          width: 7, height: 7, borderRadius: '50%', marginTop: 5, flexShrink: 0,
          background: email.isRead ? 'transparent' : cfg.color,
          border:     email.isRead ? `1.5px solid rgba(255,255,255,0.15)` : 'none',
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Subject */}
          <div style={{
            fontSize:    13,
            fontWeight:  email.isRead ? 400 : 600,
            color:       email.isRead ? '#94a3b8' : '#e2e8f0',
            whiteSpace:  'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginBottom: 3,
          }}>
            {email.subject}
          </div>

          {/* From + Date */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
              {email.from}
            </div>
            <div style={{ fontSize: 10, color: '#475569', flexShrink: 0 }}>{dateStr}</div>
          </div>

          {/* Snippet */}
          <div style={{
            fontSize: 11, color: '#475569', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {email.snippet}
          </div>

          {/* Reply button */}
          <div style={{ marginTop: 8 }}>
            <button
              onClick={e => { e.stopPropagation(); onReply(email) }}
              style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                background: `${cfg.color}15`, border: `1px solid ${cfg.color}40`, color: cfg.color,
              }}
            >
              ↩ ให้ Nam ร่างตอบ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConnectPrompt({ tab, cfg }: { tab: Tab; cfg: typeof TAB_CONFIG[Tab] }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{cfg.icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
        ยังไม่ได้เชื่อมต่อ {cfg.label}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>
        {cfg.purpose}
      </div>
      <a href={cfg.authPath} style={{
        display:      'inline-block',
        padding:      '10px 24px',
        background:   cfg.color,
        color:        '#fff',
        borderRadius: 8,
        fontSize:     13,
        fontWeight:   600,
        textDecoration: 'none',
      }}>
        เชื่อมต่อ {cfg.label}
      </a>
    </div>
  )
}

export default function EmailPage() {
  const [activeTab, setActiveTab]   = useState<Tab>('m365')
  const [emails,    setEmails]      = useState<Record<Tab, EmailMessage[]>>({ gmail: [], m365: [], cit: [] })
  const [status,    setStatus]      = useState<EmailStatus>({ gmail: { connected: false }, m365: { connected: false }, cit: { connected: false } })
  const [loading,   setLoading]     = useState<Record<Tab, boolean>>({ gmail: false, m365: false, cit: false })

  // Handle success/error from OAuth redirects
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    const err     = params.get('error')
    if (success === 'cit' || success === 'm365') {
      setActiveTab(success === 'cit' ? 'cit' : 'm365')
    }
    if (err) console.warn('[Email OAuth error]', err)
  }, [])

  const loadEmails = useCallback(async (tab: Tab) => {
    setLoading(prev => ({ ...prev, [tab]: true }))
    try {
      const providerMap: Record<Tab, string> = { gmail: 'gmail', m365: 'm365', cit: 'cit' }
      const res  = await fetch(`/api/email?provider=${providerMap[tab]}&limit=15`)
      const data = await res.json()
      setStatus(data.status ?? status)
      setEmails(prev => ({ ...prev, [tab]: data.emails ?? [] }))
    } catch {
      // ignore
    } finally {
      setLoading(prev => ({ ...prev, [tab]: false }))
    }
  }, [status])

  // Load status on mount
  useEffect(() => {
    fetch('/api/email?provider=all&limit=1')
      .then(r => r.json())
      .then(d => {
        if (d.status) setStatus(d.status)
      })
      .catch(() => {})
  }, [])

  // Load emails when tab changes (lazy)
  useEffect(() => {
    if (!emails[activeTab].length && !loading[activeTab]) {
      loadEmails(activeTab)
    }
  }, [activeTab]) // eslint-disable-line

  const cfg = TAB_CONFIG[activeTab]
  const isConnected = status[activeTab]?.connected
  const tabEmails   = emails[activeTab]

  return (
    <div style={{
      minHeight:  '100vh',
      background: 'linear-gradient(135deg, #050810 0%, #0a0f1e 100%)',
      fontFamily: 'system-ui, sans-serif',
      color:      '#e2e8f0',
    }}>
      {/* ── Top nav ── */}
      <div style={{
        padding:      '14px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        background:   'rgba(0,0,0,0.3)',
      }}>
        <Link href="/room" style={{ color: '#64748b', textDecoration: 'none', fontSize: 13 }}>
          ← Office
        </Link>
        <span style={{ color: '#1e293b' }}>|</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>📬 Inbox</span>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>

        {/* ── Account status bar ── */}
        <div style={{
          display:      'flex',
          gap:          8,
          marginBottom: 20,
          flexWrap:     'wrap',
        }}>
          {(Object.entries(TAB_CONFIG) as [Tab, typeof TAB_CONFIG[Tab]][]).map(([key, c]) => (
            <div key={key} style={{
              display:      'flex',
              alignItems:   'center',
              gap:          6,
              padding:      '5px 12px',
              borderRadius: 20,
              background:   status[key]?.connected ? `${c.color}18` : 'rgba(255,255,255,0.04)',
              border:       `1px solid ${status[key]?.connected ? `${c.color}40` : 'rgba(255,255,255,0.08)'}`,
              fontSize:     11,
            }}>
              <span>{c.icon}</span>
              <span style={{ color: status[key]?.connected ? '#e2e8f0' : '#475569', fontWeight: 600 }}>
                {c.label}
              </span>
              {status[key]?.connected
                ? <span style={{ color: '#22c55e' }}>●</span>
                : <span style={{ color: '#475569' }}>○</span>
              }
              {status[key]?.email && (
                <span style={{ color: '#475569', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {status[key].email}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={{
          display:      'flex',
          gap:          4,
          marginBottom: 20,
          background:   'rgba(255,255,255,0.03)',
          padding:      4,
          borderRadius: 10,
          border:       '1px solid rgba(255,255,255,0.06)',
        }}>
          {(Object.entries(TAB_CONFIG) as [Tab, typeof TAB_CONFIG[Tab]][]).map(([key, c]) => {
            const active = activeTab === key
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  flex:         1,
                  padding:      '9px 12px',
                  borderRadius: 7,
                  border:       'none',
                  background:   active ? `${c.color}22` : 'transparent',
                  cursor:       'pointer',
                  transition:   'all 0.15s',
                  outline:      active ? `1px solid ${c.color}40` : 'none',
                }}
              >
                <div style={{ fontSize: 16, marginBottom: 2 }}>{c.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: active ? '#e2e8f0' : '#475569' }}>{c.label}</div>
                <div style={{ fontSize: 9, color: active ? c.color : '#374151' }}>{c.alias}</div>
              </button>
            )
          })}
        </div>

        {/* ── Content ── */}
        <div style={{
          background:   'rgba(255,255,255,0.02)',
          border:       '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          overflow:     'hidden',
        }}>
          {/* Tab header */}
          <div style={{
            padding:      '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'space-between',
            background:   `${cfg.color}08`,
          }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>{cfg.icon} {cfg.label}</span>
              <span style={{ fontSize: 11, color: '#475569', marginLeft: 8 }}>{cfg.purpose}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {isConnected && (
                <button
                  onClick={() => loadEmails(activeTab)}
                  disabled={loading[activeTab]}
                  style={{
                    padding:      '5px 12px',
                    background:   'rgba(255,255,255,0.05)',
                    border:       '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    color:        '#94a3b8',
                    fontSize:     11,
                    cursor:       'pointer',
                  }}
                >
                  {loading[activeTab] ? '⟳ โหลด...' : '↻ รีเฟรช'}
                </button>
              )}
              {isConnected && (
                <span style={{
                  fontSize: 10, color: '#22c55e',
                  background: '#22c55e18', border: '1px solid #22c55e30',
                  padding: '2px 8px', borderRadius: 10,
                }}>
                  ● เชื่อมต่อแล้ว
                </span>
              )}
            </div>
          </div>

          {/* Email list */}
          <div style={{ padding: '12px 12px 4px' }}>
            {!isConnected ? (
              <ConnectPrompt tab={activeTab} cfg={cfg} />
            ) : loading[activeTab] && !tabEmails.length ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#475569', fontSize: 13 }}>
                กำลังโหลด email...
              </div>
            ) : tabEmails.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#475569', fontSize: 13 }}>
                ไม่พบ email ใหม่
              </div>
            ) : (
              tabEmails.map(email => (
                <EmailCard key={email.id} email={email} />
              ))
            )}
          </div>

          {/* Footer info */}
          {isConnected && tabEmails.length > 0 && (
            <div style={{
              padding:    '8px 16px',
              borderTop:  '1px solid rgba(255,255,255,0.04)',
              fontSize:   10,
              color:      '#374151',
              textAlign:  'center',
            }}>
              {activeTab === 'gmail'
                ? 'Gmail: แสดงเฉพาะ important และ unread (ไม่รวม promotions/social) — ประหยัด token'
                : `${cfg.label}: แสดง ${tabEmails.length} รายการล่าสุด`
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
