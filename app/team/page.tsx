'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface AgentKPI {
  agent_id: string; tasks_completed: number; tasks_failed: number
}
interface AgentContext {
  agent_id: string; context_text: string; updated_at: string
}

const AGENTS = [
  { id: 'Janie',    th: 'คุณเจนี่',   role: 'AI Orchestrator',    color: '#f59e0b' },
  { id: 'Joe',      th: 'คุณโจ',      role: 'Backend Architect',  color: '#60a5fa' },
  { id: 'Enjoy',    th: 'คุณเอนจอย',  role: 'Frontend Engineer',  color: '#f472b6' },
  { id: 'Fenton',   th: 'คุณเฟนตัน',  role: 'Quality Officer',    color: '#34d399' },
  { id: 'Karn',     th: 'คุณกานต์',   role: 'Marketing Lead',     color: '#fb923c' },
  { id: 'Kitti',    th: 'คุณกิตติ',   role: 'Legal & Compliance', color: '#818cf8' },
  { id: 'Nara',     th: 'คุณนารา',    role: 'Creative Director',  color: '#e879f9' },
  { id: 'Metha',    th: 'คุณเมธา',    role: 'CFO',                color: '#2dd4bf' },
  { id: 'Pim',      th: 'คุณพิม',     role: 'Head of Accounting', color: '#a3e635' },
  { id: 'Win',      th: 'คุณวิน',     role: 'Biz Development',    color: '#38bdf8' },
  { id: 'Nam',      th: 'คุณน้ำ',     role: 'Customer Support',   color: '#4ade80' },
  { id: 'Kom',      th: 'คุณคมน์',    role: 'Risk Officer',       color: '#fbbf24' },
  { id: 'Raps',     th: 'แรปส์',      role: 'HR & Knowledge',     color: '#f87171' },
  { id: 'Ferin',    th: 'คุณเฟริน',   role: 'Chief Procurement',  color: '#c084fc' },
  { id: 'Exploiter',th: 'Exploiter',  role: 'IT Shortcut Agent',  color: '#ef4444' },
]

export default function TeamPage() {
  const [kpis,    setKpis]    = useState<AgentKPI[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [context,  setContext]  = useState<AgentContext | null>(null)
  const [editing,  setEditing]  = useState(false)
  const [editText, setEditText] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [ctxLoading, setCtxLoading] = useState(false)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => setKpis(d.agentLeaderboard?.map((a: {id:string; completed:number; failed:number}) => ({
        agent_id: a.id, tasks_completed: a.completed, tasks_failed: a.failed
      })) ?? []))
  }, [])

  const loadContext = async (id: string) => {
    setCtxLoading(true)
    setContext(null)
    setEditing(false)
    try {
      const res = await fetch(`/api/agents/context?agent_id=${id}`)
      const d = await res.json()
      setContext(d.context ?? null)
      setEditText(d.context?.context_text ?? '')
    } finally {
      setCtxLoading(false)
    }
  }

  const handleSelect = (id: string) => {
    setSelected(id)
    loadContext(id)
  }

  const saveContext = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await fetch('/api/agents/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: selected, context_text: editText }),
      })
      setContext(prev => prev ? { ...prev, context_text: editText } : null)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const getKPI = (id: string) => kpis.find(k => k.agent_id === id)

  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117',
      fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#f0f6fc',
    }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,17,23,0.95)', borderBottom: '1px solid #30363d',
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 44,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff',
        }}>B3</div>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 2, color: '#f0f6fc' }}>TEAM AVENGER</div>
        <div style={{ width: 1, height: 18, background: '#30363d', margin: '0 4px' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399' }}>👥 TEAM</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {[
            { label: 'DASHBOARD', href: '/dashboard', color: '#60a5fa' },
            { label: 'ANALYTICS', href: '/analytics', color: '#a855f7' },
            { label: 'HISTORY',   href: '/history',   color: '#f59e0b' },
          ].map(l => (
            <Link key={l.href} href={l.href} style={{
              padding: '3px 10px', borderRadius: 5, fontSize: 9, fontWeight: 700,
              background: `${l.color}18`, border: `1px solid ${l.color}33`,
              color: l.color, textDecoration: 'none',
            }}>{l.label}</Link>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 44px)' }}>

        {/* ── Agent Grid ── */}
        <div style={{
          width: 340, borderRight: '1px solid #30363d',
          overflowY: 'auto', padding: 16,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4b5563', letterSpacing: 1, marginBottom: 12 }}>
            {AGENTS.length} AGENTS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {AGENTS.map(a => {
              const kpi = getKPI(a.id)
              return (
                <div key={a.id}
                  onClick={() => handleSelect(a.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    background: selected === a.id ? '#1c2128' : 'transparent',
                    border: selected === a.id ? `1px solid ${a.color}44` : '1px solid transparent',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                    border: `2px solid ${selected === a.id ? a.color : '#30363d'}`,
                  }}>
                    <Image src={`/characters/${a.id.toLowerCase()}.png`} alt={a.id}
                      width={36} height={36} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f6fc' }}>{a.id}</span>
                      <span style={{ fontSize: 9, color: a.color, fontWeight: 600 }}>{a.th}</span>
                    </div>
                    <div style={{ fontSize: 9, color: '#4b5563' }}>{a.role}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: '#22c55e' }}>
                      {kpi?.tasks_completed ?? 0}
                    </div>
                    <div style={{ fontSize: 8, color: '#4b5563' }}>tasks</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Detail Panel ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {!selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4b5563' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👈</div>
              <div style={{ fontSize: 13 }}>เลือก Agent ที่ต้องการดูรายละเอียด</div>
            </div>
          ) : (() => {
            const agent = AGENTS.find(a => a.id === selected)!
            const kpi   = getKPI(selected)
            const successRate = (kpi?.tasks_completed ?? 0) + (kpi?.tasks_failed ?? 0) > 0
              ? Math.round(((kpi?.tasks_completed ?? 0) / ((kpi?.tasks_completed ?? 0) + (kpi?.tasks_failed ?? 0))) * 100)
              : 0
            return (
              <div style={{ maxWidth: 700 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: 16, overflow: 'hidden',
                    border: `3px solid ${agent.color}`,
                    boxShadow: `0 0 20px ${agent.color}44`,
                  }}>
                    <Image src={`/characters/${agent.id.toLowerCase()}.png`} alt={agent.id}
                      width={80} height={80} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#f0f6fc' }}>{agent.id}</div>
                    <div style={{ fontSize: 13, color: agent.color, fontWeight: 600 }}>{agent.th}</div>
                    <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>{agent.role}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
                    {[
                      { label: 'Done',    val: kpi?.tasks_completed ?? 0, color: '#22c55e' },
                      { label: 'Failed',  val: kpi?.tasks_failed ?? 0,    color: '#f87171' },
                      { label: 'Success', val: `${successRate}%`,         color: '#60a5fa' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: 9, color: '#4b5563' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Context Editor */}
                <div style={{
                  background: '#161b22', border: '1px solid #30363d',
                  borderRadius: 10, overflow: 'hidden',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px', borderBottom: '1px solid #30363d',
                    background: '#0d1117',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#8b949e' }}>
                      📄 AGENT CONTEXT
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {editing ? (
                        <>
                          <button onClick={() => setEditing(false)} style={{
                            padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                            color: '#f87171', cursor: 'pointer',
                          }}>ยกเลิก</button>
                          <button onClick={saveContext} disabled={saving} style={{
                            padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                            background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
                            color: '#4ade80', cursor: 'pointer', opacity: saving ? 0.5 : 1,
                          }}>{saving ? 'กำลังบันทึก...' : '💾 บันทึก'}</button>
                        </>
                      ) : (
                        <button onClick={() => setEditing(true)} style={{
                          padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                          background: `${agent.color}18`, border: `1px solid ${agent.color}33`,
                          color: agent.color, cursor: 'pointer',
                        }}>✏️ แก้ไข</button>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: 16 }}>
                    {ctxLoading ? (
                      <div style={{ color: '#4b5563', fontSize: 11 }}>กำลังโหลด context...</div>
                    ) : editing ? (
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        style={{
                          width: '100%', minHeight: 320, background: '#0d1117',
                          border: '1px solid #30363d', borderRadius: 6,
                          padding: 12, color: '#f0f6fc', fontSize: 11,
                          fontFamily: 'monospace', lineHeight: 1.6,
                          outline: 'none', resize: 'vertical',
                        }}
                      />
                    ) : (
                      <pre style={{
                        margin: 0, color: '#8b949e', fontSize: 11,
                        fontFamily: 'monospace', lineHeight: 1.7,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {context?.context_text ?? '(ยังไม่มี context — กด แก้ไข เพื่อเพิ่ม)'}
                      </pre>
                    )}
                  </div>
                  {context?.updated_at && (
                    <div style={{ padding: '6px 16px', borderTop: '1px solid #21262d', fontSize: 9, color: '#4b5563' }}>
                      อัปเดตล่าสุด: {new Date(context.updated_at).toLocaleString('th-TH')}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
