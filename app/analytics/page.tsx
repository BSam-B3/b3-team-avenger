'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Summary {
  totalDone: number; totalFailed: number; totalCost: number
  totalTokensIn: number; totalTokensOut: number; totalAgents: number
}
interface AgentStat {
  id: string; completed: number; failed: number
  messages: number; cost: number; successRate: number
}
interface BackendStat { backend: string; calls: number; cost: number }
interface DayStat { date: string; done: number; total: number }

const BACKEND_COLOR: Record<string, string> = {
  gemini: '#4ade80', groq: '#f59e0b', claude: '#a855f7',
  openai: '#60a5fa', template: '#475569',
}

export default function AnalyticsPage() {
  const [summary,     setSummary]     = useState<Summary | null>(null)
  const [agents,      setAgents]      = useState<AgentStat[]>([])
  const [backends,    setBackends]    = useState<BackendStat[]>([])
  const [days,        setDays]        = useState<DayStat[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => {
        setSummary(d.summary)
        setAgents(d.agentLeaderboard ?? [])
        setBackends(d.backendStats ?? [])
        setDays(d.tasksByDay ?? [])
        setLoading(false)
      })
  }, [])

  const maxDone = Math.max(...days.map(d => d.total), 1)
  const maxAgent = Math.max(...agents.map(a => a.completed), 1)
  const totalBackendCalls = backends.reduce((s, b) => s + b.calls, 0) || 1

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
        <span style={{ fontSize: 11, fontWeight: 700, color: '#a855f7' }}>📊 ANALYTICS</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {[
            { label: 'DASHBOARD', href: '/dashboard', color: '#60a5fa' },
            { label: 'TEAM',      href: '/team',      color: '#34d399' },
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

      <div style={{ padding: '20px 24px', maxWidth: 1200, margin: '0 auto' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#4b5563' }}>กำลังโหลด...</div>
        ) : (
          <>
            {/* ── Summary Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Tasks Done',    val: summary?.totalDone ?? 0,   icon: '✅', color: '#22c55e' },
                { label: 'Tasks Failed',  val: summary?.totalFailed ?? 0, icon: '❌', color: '#f87171' },
                { label: 'Total Cost',    val: `$${(summary?.totalCost ?? 0).toFixed(4)}`, icon: '💰', color: '#f59e0b' },
                { label: 'Tokens Used',   val: ((summary?.totalTokensIn ?? 0) + (summary?.totalTokensOut ?? 0)).toLocaleString(), icon: '🔢', color: '#a855f7' },
                { label: 'Active Agents', val: summary?.totalAgents ?? 0,  icon: '🤖', color: '#60a5fa' },
              ].map(c => (
                <div key={c.label} style={{
                  background: '#161b22', border: `1px solid ${c.color}33`,
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{c.val}</div>
                  <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>{c.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              {/* ── Task Activity (7 days) ── */}
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8b949e', letterSpacing: 1, marginBottom: 16 }}>
                  📅 TASK ACTIVITY — 7 DAYS
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
                  {days.map(d => (
                    <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{ fontSize: 8, color: '#22c55e', fontWeight: 700 }}>{d.done || ''}</div>
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <div style={{
                          width: '100%', borderRadius: 2,
                          height: Math.max(4, (d.done / maxDone) * 60),
                          background: 'linear-gradient(180deg, #22c55e, #16a34a)',
                        }} />
                        {d.total > d.done && (
                          <div style={{
                            width: '100%', borderRadius: 2,
                            height: Math.max(2, ((d.total - d.done) / maxDone) * 60),
                            background: '#374151',
                          }} />
                        )}
                      </div>
                      <div style={{ fontSize: 7, color: '#4b5563' }}>
                        {d.date.slice(5)}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 1, background: '#22c55e' }} />
                    <span style={{ fontSize: 9, color: '#4b5563' }}>Done</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 1, background: '#374151' }} />
                    <span style={{ fontSize: 9, color: '#4b5563' }}>Pending/Failed</span>
                  </div>
                </div>
              </div>

              {/* ── Backend Usage ── */}
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8b949e', letterSpacing: 1, marginBottom: 16 }}>
                  🤖 AI BACKEND USAGE
                </div>
                {backends.length === 0 ? (
                  <div style={{ color: '#4b5563', fontSize: 11, padding: '20px 0' }}>ยังไม่มีข้อมูล</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {backends.map(b => {
                      const pct = Math.round((b.calls / totalBackendCalls) * 100)
                      const col = BACKEND_COLOR[b.backend] ?? '#60a5fa'
                      return (
                        <div key={b.backend}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: col, textTransform: 'uppercase' }}>
                              {b.backend}
                            </span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <span style={{ fontSize: 9, color: '#4b5563' }}>{b.calls} calls</span>
                              <span style={{ fontSize: 9, color: '#f59e0b' }}>${b.cost.toFixed(4)}</span>
                            </div>
                          </div>
                          <div style={{ height: 6, background: '#21262d', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 3, transition: 'width 0.6s' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Agent Leaderboard ── */}
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8b949e', letterSpacing: 1, marginBottom: 16 }}>
                🏆 AGENT LEADERBOARD
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {agents.map((a, i) => (
                  <div key={a.id} style={{
                    background: '#0d1117', border: '1px solid #30363d',
                    borderRadius: 8, padding: '12px 14px',
                    borderTop: i === 0 ? '2px solid #f59e0b' : i === 1 ? '2px solid #9ca3af' : i === 2 ? '2px solid #b45309' : '2px solid #30363d',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                        <Image src={`/characters/${a.id.toLowerCase()}.png`} alt={a.id}
                          width={28} height={28} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#f0f6fc' }}>{a.id}</div>
                        <div style={{ fontSize: 8, color: '#4b5563' }}>{a.messages} messages</div>
                      </div>
                      {i < 3 && (
                        <span style={{ marginLeft: 'auto', fontSize: 14 }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                        </span>
                      )}
                    </div>

                    {/* tasks done bar */}
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 8, color: '#4b5563' }}>Tasks done</span>
                        <span style={{ fontSize: 8, fontWeight: 700, color: '#22c55e' }}>{a.completed}</span>
                      </div>
                      <div style={{ height: 3, background: '#21262d', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(a.completed / maxAgent) * 100}%`, background: '#22c55e', borderRadius: 2 }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 8, color: a.successRate >= 80 ? '#22c55e' : a.successRate >= 50 ? '#f59e0b' : '#f87171' }}>
                        {a.successRate}% success
                      </span>
                      <span style={{ fontSize: 8, color: '#f59e0b' }}>${a.cost.toFixed(4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
