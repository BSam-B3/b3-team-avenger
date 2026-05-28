'use client'

/**
 * UsagePanel — Token & API Cost Dashboard
 *
 * แสดง:
 *   • Total calls, tokens in/out, estimated cost (USD)
 *   • แยกตาม backend (Groq / Gemini / Claude)
 *   • Top agents by usage
 *   • Recent 10 calls
 *
 * Refreshes ทุก 30 วินาที
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BackendStats {
  calls:     number
  tokensIn:  number
  tokensOut: number
  costUsd:   number
}

interface UsageStats {
  totals:    BackendStats & { calls: number }
  byBackend: Record<string, BackendStats>
  byAgent:   Record<string, BackendStats>
  recent:    { agent: string; backend: string; tokensIn: number; tokensOut: number; costUsd: number; at: string }[]
  lastUpdated: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtCost(n: number): string {
  if (n === 0) return '$0.00'
  if (n < 0.0001) return '<$0.0001'
  if (n < 0.01)   return `$${n.toFixed(4)}`
  return `$${n.toFixed(4)}`
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return '' }
}

const BACKEND_COLOR: Record<string, string> = {
  groq:     '#10b981',
  gemini:   '#3b82f6',
  claude:   '#a855f7',
  template: '#6b7280',
}

const BACKEND_LABEL: Record<string, string> = {
  groq:     'Groq (Llama)',
  gemini:   'Gemini Flash',
  claude:   'Claude Haiku',
  template: 'Template',
}

// FREE = ไม่มีค่าใช้จ่ายจริง, ค่าที่โชว์คือ estimate เท่านั้น
const FREE_BACKENDS = new Set(['groq', 'gemini', 'template'])
const FREE_QUOTA: Record<string, { daily: number; label: string }> = {
  groq:   { daily: 14_400, label: 'req/วัน' },
  gemini: { daily: 1_500,  label: 'req/วัน' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = '#f59e0b' }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8, padding: '10px 14px',
    }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function BackendBar({ name, stats, total }: { name: string; stats: BackendStats; total: number }) {
  const pct     = total > 0 ? (stats.calls / total) * 100 : 0
  const color   = BACKEND_COLOR[name] ?? '#6b7280'
  const isFree  = FREE_BACKENDS.has(name)
  const quota   = FREE_QUOTA[name]
  const pctUsed = quota ? Math.round((stats.calls / quota.daily) * 100) : null

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 10, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color, fontWeight: 600 }}>{BACKEND_LABEL[name] ?? name}</span>
          {isFree && (
            <span style={{
              fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
              background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80',
            }}>FREE</span>
          )}
          {!isFree && (
            <span style={{
              fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
              background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b',
            }}>PAID</span>
          )}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          {stats.calls} calls · {fmtTokens(stats.tokensIn + stats.tokensOut)} tok
          {isFree
            ? <span style={{ color: '#4ade80', marginLeft: 4 }}>✓ ฟรี</span>
            : <span style={{ color: '#f59e0b', marginLeft: 4 }}>{fmtCost(stats.costUsd)}</span>
          }
        </span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
      {quota && pctUsed !== null && (
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
          Quota วันนี้: {stats.calls.toLocaleString()} / {quota.daily.toLocaleString()} {quota.label}
          {' '}({100 - pctUsed}% เหลือ)
          {pctUsed >= 80 && <span style={{ color: '#f87171', marginLeft: 4 }}>⚠ ใกล้เต็ม</span>}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export default function UsagePanel({ onClose }: Props) {
  const [stats, setStats]     = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'overview' | 'agents' | 'recent'>('overview')

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/usage/stats')
      if (res.ok) setStats(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchStats()
    const iv = setInterval(fetchStats, 30_000)
    return () => clearInterval(iv)
  }, [fetchStats])

  const totalCalls   = stats?.totals.calls    ?? 0
  const totalCostUsd = stats?.totals.costUsd ?? 0
  // คำนวณเฉพาะ backend ที่จ่ายจริง (ไม่รวม groq/gemini/template)
  const paidCostUsd  = Object.entries(stats?.byBackend ?? {})
    .filter(([name]) => !FREE_BACKENDS.has(name))
    .reduce((sum, [, s]) => sum + s.costUsd, 0)
  const freeCalls    = Object.entries(stats?.byBackend ?? {})
    .filter(([name]) => FREE_BACKENDS.has(name))
    .reduce((sum, [, s]) => sum + s.calls, 0)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1,    y: 0  }}
      exit={{   opacity: 0, scale: 0.95, y: 10  }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: 480, maxHeight: '80vh',
        background: 'linear-gradient(180deg, #0f1629 0%, #0a0f1e 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>

        {/* Header */}
        <div style={{
          padding: '14px 18px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>📊 API Usage Dashboard</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
              {stats?.lastUpdated ? `อัพเดต ${fmtTime(stats.lastUpdated)}` : 'กำลังโหลด...'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6,
              color: 'rgba(255,255,255,0.6)', padding: '4px 10px', cursor: 'pointer', fontSize: 12,
            }}
          >✕</button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, padding: '8px 18px 0',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          {(['overview', 'agents', 'recent'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? 'rgba(245,158,11,0.15)' : 'transparent',
                border: tab === t ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
                borderBottom: 'none', borderRadius: '6px 6px 0 0',
                color: tab === t ? '#f59e0b' : 'rgba(255,255,255,0.45)',
                padding: '6px 14px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                transition: 'all 0.15s',
              }}
            >
              { t === 'overview' ? '🏠 ภาพรวม' : t === 'agents' ? '👥 Agent' : '🕐 ล่าสุด' }
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 18px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40, fontSize: 13 }}>
              กำลังโหลดข้อมูล...
            </div>
          ) : !stats || stats.totals.calls === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>ยังไม่มีการใช้งาน API</div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 4 }}>
                ส่ง task ให้ทีมเพื่อเริ่มติดตามการใช้งาน
              </div>
            </div>
          ) : (

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{   opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >

                {/* ── Overview Tab ── */}
                {tab === 'overview' && (
                  <div>
                    {/* Stat cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                      <StatCard label="API Calls" value={totalCalls.toLocaleString()} sub="ทั้งหมด" />
                      <StatCard
                        label="จ่ายจริง (Paid API)"
                        value={paidCostUsd > 0 ? fmtCost(paidCostUsd) : 'ฟรี ✓'}
                        sub={paidCostUsd > 0 ? 'Claude/OpenAI เท่านั้น' : `${freeCalls} calls ใช้ Groq/Gemini ฟรี`}
                        color={paidCostUsd > 0 ? '#f59e0b' : '#4ade80'}
                      />
                      <StatCard
                        label="Tokens (Input)"
                        value={fmtTokens(stats.totals.tokensIn)}
                        sub="prompt tokens"
                        color="#3b82f6"
                      />
                      <StatCard
                        label="Tokens (Output)"
                        value={fmtTokens(stats.totals.tokensOut)}
                        sub="completion tokens"
                        color="#a855f7"
                      />
                    </div>

                    {/* Backend breakdown */}
                    <div style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 8, padding: '12px 14px',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
                        📡 แยกตาม Backend
                      </div>
                      {Object.entries(stats.byBackend).map(([name, s]) => (
                        <BackendBar key={name} name={name} stats={s} total={totalCalls} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Agents Tab ── */}
                {tab === 'agents' && (
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
                      เรียงตาม cost (มากไปน้อย)
                    </div>
                    {Object.entries(stats.byAgent).length === 0 ? (
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 20 }}>
                        ยังไม่มีข้อมูล
                      </div>
                    ) : (
                      Object.entries(stats.byAgent).map(([agentId, s]) => (
                        <div key={agentId} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 12px', marginBottom: 4,
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 6,
                        }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>{agentId}</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                              {s.calls} calls · {fmtTokens(s.tokensIn + s.tokensOut)} tokens
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{fmtCost(s.costUsd)}</div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>USD</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ── Recent Tab ── */}
                {tab === 'recent' && (
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
                      10 calls ล่าสุด
                    </div>
                    {stats.recent.map((r, i) => {
                      const bColor = BACKEND_COLOR[r.backend] ?? '#6b7280'
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '7px 10px', marginBottom: 4,
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: 6,
                        }}>
                          {/* Backend dot */}
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: bColor, flexShrink: 0,
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>
                              {r.agent ?? '—'}
                              <span style={{ fontSize: 9, color: bColor, marginLeft: 6 }}>{r.backend}</span>
                            </div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>
                              {fmtTime(r.at)} · ↑{fmtTokens(r.tokensIn)} ↓{fmtTokens(r.tokensOut)}
                            </div>
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#10b981', flexShrink: 0 }}>
                            {fmtCost(r.costUsd)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          )}
        </div>

      </div>
    </motion.div>
  )
}
