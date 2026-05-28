'use client'

/**
 * /history — ประวัติการสนทนาและ agent responses ทั้งหมด
 *
 * Features:
 *   • Paginate 20 conversations/page, newest first
 *   • Collapsible — click to expand agent messages
 *   • Status badge (processing / done / summarizing)
 *   • Summary displayed if available
 *   • Dark theme matching /room (background #030712, gold #f59e0b, indigo #818cf8)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentMessage {
  id:              string
  conversation_id: string
  agent_id:        string
  content:         string
  role:            string
  created_at:      string
}

interface Conversation {
  id:               string
  user_message:     string
  janie_ack:        string | null
  agents_assigned:  string[] | null
  status:           string
  created_at:       string
  summary:          string | null
  agent_messages:   AgentMessage[]
}

interface HistoryResponse {
  conversations: Conversation[]
  total:         number
  page:          number
  pages:         number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return iso }
}

function truncate(str: string, len = 120): string {
  return str.length > len ? str.slice(0, len) + '…' : str
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    processing:  { label: '⏳ Processing',  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
    done:        { label: '✅ Done',         color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
    summarizing: { label: '📝 Summarizing', color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  }
  const s = cfg[status] ?? { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: s.bg, color: s.color,
      border: `1px solid ${s.color}33`,
      borderRadius: 20, padding: '2px 10px',
      fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

// ─── Agent Message Row ────────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  Janie:  '#818cf8', Joe:   '#60a5fa', Enjoy:  '#f472b6',
  Fenton: '#34d399', Karn:  '#fb923c', Kitti:  '#a78bfa',
  Nara:   '#f59e0b', Metha: '#2dd4bf', Pim:    '#facc15',
  Win:    '#4ade80', Nam:   '#38bdf8', Kom:    '#f87171',
  Raps:   '#c084fc', Ferin: '#fdba74',
}

function AgentMsgRow({ msg }: { msg: AgentMessage }) {
  const color = AGENT_COLORS[msg.agent_id] ?? '#94a3b8'
  return (
    <div style={{
      display: 'flex', gap: 10,
      padding: '8px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      {/* Agent dot + name */}
      <div style={{ flexShrink: 0, width: 64, textAlign: 'right' }}>
        <div style={{
          display: 'inline-block',
          background: `${color}22`,
          border: `1px solid ${color}55`,
          borderRadius: 4,
          padding: '1px 6px',
          fontSize: 10, fontWeight: 700, color,
        }}>
          {msg.agent_id}
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
          {fmtTime(msg.created_at)}
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        fontSize: 12,
        color: 'rgba(255,255,255,0.75)',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>
    </div>
  )
}

// ─── Conversation Card ────────────────────────────────────────────────────────

function ConvCard({ conv, index }: { conv: Conversation; index: number }) {
  const [open, setOpen] = useState(false)

  const hasMessages = conv.agent_messages.length > 0
  const hasSummary  = !!conv.summary?.trim()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${open ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 10,
        overflow: 'hidden',
        transition: 'border-color 0.2s',
        marginBottom: 8,
      }}
    >
      {/* ── Header row (always visible) ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '12px 16px',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}
      >
        {/* Expand chevron */}
        <span style={{
          fontSize: 10, color: '#475569', flexShrink: 0,
          marginTop: 3, transition: 'transform 0.2s',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>
          ▶
        </span>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Top row: date + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>
              {fmtDate(conv.created_at)}
            </span>
            <StatusBadge status={conv.status} />
            {conv.agents_assigned && conv.agents_assigned.length > 0 && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                → {conv.agents_assigned.join(', ')}
              </span>
            )}
          </div>

          {/* User message */}
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: '#f59e0b',
            marginBottom: 4,
            lineHeight: 1.4,
          }}>
            {open ? conv.user_message : truncate(conv.user_message, 200)}
          </div>

          {/* Janie ack (preview) */}
          {conv.janie_ack && (
            <div style={{
              fontSize: 11, color: '#818cf8',
              lineHeight: 1.4,
            }}>
              {open ? conv.janie_ack : truncate(conv.janie_ack, 120)}
            </div>
          )}

          {/* Message count hint when collapsed */}
          {!open && hasMessages && (
            <div style={{ marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
              💬 {conv.agent_messages.length} agent response{conv.agent_messages.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </button>

      {/* ── Expanded: agent messages + summary ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              padding: '12px 16px 16px 16px',
            }}>

              {/* Agent messages */}
              {hasMessages ? (
                <div style={{ marginBottom: hasSummary ? 14 : 0 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
                    letterSpacing: 1, textTransform: 'uppercase',
                    marginBottom: 8,
                  }}>
                    Agent Responses
                  </div>
                  {conv.agent_messages.map(m => (
                    <AgentMsgRow key={m.id} msg={m} />
                  ))}
                </div>
              ) : (
                <div style={{
                  fontSize: 12, color: 'rgba(255,255,255,0.25)',
                  textAlign: 'center', padding: '8px 0',
                }}>
                  ยังไม่มี agent responses
                </div>
              )}

              {/* Summary */}
              {hasSummary && (
                <div style={{
                  marginTop: 10,
                  background: 'rgba(129,140,248,0.06)',
                  border: '1px solid rgba(129,140,248,0.2)',
                  borderRadius: 6,
                  padding: '10px 14px',
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: '#818cf8',
                    letterSpacing: 1, textTransform: 'uppercase',
                    marginBottom: 6,
                  }}>
                    📝 Summary
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                    {conv.summary}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [data,      setData]      = useState<HistoryResponse | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [page,      setPage]      = useState(1)
  const [newCount,  setNewCount]  = useState(0)   // badge: new convs since last load
  const latestIdRef = useRef<string | null>(null)

  const fetchHistory = useCallback(async (p: number, silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/history?page=${p}&limit=20`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: HistoryResponse = await res.json()
      setData(json)
      setNewCount(0)
      // Track newest ID so Realtime can detect truly new conversations
      if (json.conversations[0]) latestIdRef.current = json.conversations[0].id
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { fetchHistory(page) }, [page, fetchHistory])

  // Realtime: show badge when new conversation arrives — NO auto-refresh
  useEffect(() => {
    const channel = supabase
      .channel('history_new_convs')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'janie_conversations',
      }, (payload) => {
        // Only count if it's genuinely newer than what we loaded
        if (payload.new.id !== latestIdRef.current) {
          setNewCount(c => c + 1)
        }
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [])

  function goPage(p: number) {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={{
      background:   '#030712',
      minHeight:    '100vh',
      padding:      '20px 16px 48px',
      fontFamily:   'system-ui, sans-serif',
      color:        '#fff',
    }}>

      {/* ── Top bar ── */}
      <div style={{
        maxWidth: 760,
        margin:   '0 auto 20px',
        display:  'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/room" style={{
            fontSize: 11, color: '#64748b', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            ← ห้องผู้บริหาร
          </Link>
          <span style={{ color: '#1e293b' }}>│</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>
            📜 ประวัติการสนทนา
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          {data && (
            <span style={{ fontSize: 11, color: '#475569' }}>
              {data.total.toLocaleString()} conversations
            </span>
          )}
          {/* New badge — click to load without disrupting reading */}
          {newCount > 0 && (
            <button
              onClick={() => fetchHistory(1)}
              style={{
                background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
                color: '#4ade80', borderRadius: 20, padding: '4px 12px',
                fontSize: 11, cursor: 'pointer', fontWeight: 700,
                animation: 'pulse 2s ease-in-out infinite',
              }}
            >
              ● {newCount} สนทนาใหม่ — คลิกเพื่อโหลด
            </button>
          )}
          <button
            onClick={() => fetchHistory(page)}
            disabled={loading}
            style={{
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
              color: loading ? '#475569' : '#f59e0b', borderRadius: 6,
              padding: '3px 10px', fontSize: 10, cursor: loading ? 'default' : 'pointer',
              fontWeight: 600,
            }}
          >
            {loading ? '⏳' : '🔄'} รีเฟรช
          </button>
        </div>
      </div>

      {/* ── Content area ── */}
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
            กำลังโหลด...
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div style={{
            textAlign: 'center', padding: '60px 0',
            color: '#f87171', fontSize: 13,
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <div style={{ marginBottom: 12 }}>เกิดข้อผิดพลาด: {error}</div>
            <button
              onClick={() => fetchHistory(page)}
              style={{
                background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)',
                color: '#f87171', borderRadius: 6, padding: '6px 16px',
                cursor: 'pointer', fontSize: 12,
              }}
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && data?.conversations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
              ยังไม่มีประวัติการสนทนา
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
              เริ่มสนทนากับ Janie เพื่อสร้างประวัติ
            </div>
            <Link href="/room" style={{
              display: 'inline-block', marginTop: 16,
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
              color: '#f59e0b', borderRadius: 6, padding: '6px 18px',
              textDecoration: 'none', fontSize: 12, fontWeight: 600,
            }}>
              ไปที่ห้อง →
            </Link>
          </div>
        )}

        {/* Conversations list */}
        {!loading && !error && data && data.conversations.length > 0 && (
          <>
            {data.conversations.map((conv, i) => (
              <ConvCard key={conv.id} conv={conv} index={i} />
            ))}

            {/* Pagination */}
            {data.pages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, marginTop: 24,
              }}>
                <button
                  onClick={() => goPage(page - 1)}
                  disabled={page <= 1}
                  style={{
                    background: page <= 1 ? 'rgba(255,255,255,0.04)' : 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    color: page <= 1 ? '#334155' : '#f59e0b',
                    borderRadius: 6, padding: '5px 14px',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                  }}
                >
                  ← ก่อนหน้า
                </button>

                {/* Page numbers (show at most 7) */}
                {Array.from({ length: Math.min(data.pages, 7) }, (_, i) => {
                  const p = Math.min(
                    Math.max(1, page - 3),
                    Math.max(1, data.pages - 6)
                  ) + i
                  if (p < 1 || p > data.pages) return null
                  return (
                    <button
                      key={p}
                      onClick={() => goPage(p)}
                      style={{
                        background: p === page ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${p === page ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        color: p === page ? '#f59e0b' : '#64748b',
                        borderRadius: 6, padding: '5px 10px',
                        cursor: 'pointer', fontSize: 12, fontWeight: p === page ? 700 : 400,
                        minWidth: 34,
                      }}
                    >
                      {p}
                    </button>
                  )
                })}

                <button
                  onClick={() => goPage(page + 1)}
                  disabled={page >= data.pages}
                  style={{
                    background: page >= data.pages ? 'rgba(255,255,255,0.04)' : 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    color: page >= data.pages ? '#334155' : '#f59e0b',
                    borderRadius: 6, padding: '5px 14px',
                    cursor: page >= data.pages ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                  }}
                >
                  ถัดไป →
                </button>
              </div>
            )}

            {/* Page info */}
            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 10, color: '#334155' }}>
              หน้า {page} / {data.pages} · แสดง {data.conversations.length} จาก {data.total} รายการ
            </div>
          </>
        )}

      </div>
    </div>
  )
}
