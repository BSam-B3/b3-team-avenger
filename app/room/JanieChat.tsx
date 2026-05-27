'use client'

/**
 * JanieChat — ระบบสั่งงานผ่านเลขา Janie
 *
 * Flow:
 *   B3 พิมพ์คำสั่ง
 *   → Janie วิเคราะห์ → assign agent → แสดง ack ทันที
 *   → poll status ทุก 2s จนทุก agent ตอบ
 *   → Janie สรุปผล
 *   → Raps HR อัพเดต context อัตโนมัติ
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

type MsgRole = 'user' | 'janie' | 'agent' | 'summary' | 'system'

interface ChatMessage {
  id:        string
  role:      MsgRole
  agentId?:  string
  content:   string
  ts:        number
}

interface TaskStatus {
  id:          string
  assigned_to: string
  task_detail: string
  status:      'pending' | 'in_progress' | 'done' | 'failed'
}

interface KPIEntry {
  agent_id:        string
  tasks_total:     number
  tasks_completed: number
  tasks_failed:    number
}

// ─── Agent colour map ─────────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  Janie:  '#818cf8',
  Joe:    '#38bdf8',
  Enjoy:  '#f472b6',
  Fenton: '#fb923c',
  Karn:   '#4ade80',
  Kitti:  '#facc15',
  Nara:   '#e879f9',
  Metha:  '#34d399',
  Pim:    '#a78bfa',
  Win:    '#60a5fa',
  Nam:    '#f9a8d4',
  Kom:    '#f87171',
  Raps:   '#fbbf24',
}

function agentColor(id: string) { return AGENT_COLORS[id] ?? '#94a3b8' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9) }

function taskBadge(status: TaskStatus['status']) {
  const map = {
    pending:     { label: 'รอ',   color: '#64748b' },
    in_progress: { label: '⚙ ทำ', color: '#f59e0b' },
    done:        { label: '✓',    color: '#22c55e' },
    failed:      { label: '✗',    color: '#ef4444' },
  }
  return map[status] ?? map.pending
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  const color  = msg.agentId ? agentColor(msg.agentId) : (msg.role === 'janie' || msg.role === 'summary' ? '#818cf8' : '#94a3b8')

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        display:        'flex',
        flexDirection:  isUser ? 'row-reverse' : 'row',
        alignItems:     'flex-start',
        gap:            8,
        marginBottom:   10,
      }}
    >
      {/* Avatar */}
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: `${color}22`,
          border:     `1.5px solid ${color}55`,
          display:    'flex', alignItems: 'center', justifyContent: 'center',
          fontSize:   8, fontWeight: 700, color,
          lineHeight: 1,
        }}>
          {msg.agentId ?? (msg.role === 'summary' ? '📋' : 'J')}
        </div>
      )}

      {/* Bubble */}
      <div style={{
        maxWidth:     '78%',
        background:   isUser
          ? 'linear-gradient(135deg, #1e3a5f, #1a2f4a)'
          : msg.role === 'summary'
          ? 'linear-gradient(135deg, #1e1b4b, #2d2775)'
          : `${color}12`,
        border:       `1px solid ${isUser ? 'rgba(59,130,246,0.3)' : `${color}30`}`,
        borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        padding:      '8px 12px',
      }}>
        {/* Agent label */}
        {msg.agentId && !isUser && (
          <div style={{ fontSize: 9, fontWeight: 700, color, marginBottom: 3, letterSpacing: 0.5 }}>
            {msg.agentId}
          </div>
        )}
        {msg.role === 'summary' && (
          <div style={{ fontSize: 9, fontWeight: 700, color: '#818cf8', marginBottom: 4, letterSpacing: 0.5 }}>
            📋 สรุปผลจาก Janie
          </div>
        )}
        <div style={{
          fontSize:   12,
          color:      isUser ? '#e2e8f0' : '#cbd5e1',
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          wordBreak:  'break-word',
        }}>
          {msg.content}
        </div>
      </div>
    </motion.div>
  )
}

function TaskTracker({ tasks }: { tasks: TaskStatus[] }) {
  if (!tasks.length) return null
  return (
    <div style={{
      padding:      '8px 12px',
      background:   'rgba(15,20,35,0.8)',
      borderTop:    '1px solid rgba(255,255,255,0.05)',
      display:      'flex',
      flexWrap:     'wrap',
      gap:          6,
    }}>
      {tasks.map(t => {
        const badge = taskBadge(t.status)
        return (
          <div key={t.id} title={t.task_detail} style={{
            display:      'flex',
            alignItems:   'center',
            gap:          4,
            padding:      '3px 8px',
            borderRadius: 12,
            background:   `${badge.color}18`,
            border:       `1px solid ${badge.color}40`,
            fontSize:     9,
            color:        badge.color,
            fontWeight:   600,
          }}>
            <span style={{ color: agentColor(t.assigned_to) }}>{t.assigned_to}</span>
            <span style={{ color: '#475569', margin: '0 1px' }}>·</span>
            {badge.label}
          </div>
        )
      })}
    </div>
  )
}

function KPIStrip({ kpi }: { kpi: KPIEntry[] }) {
  if (!kpi.length) return null
  return (
    <div style={{
      padding:        '6px 12px',
      borderTop:      '1px solid rgba(255,255,255,0.04)',
      display:        'flex',
      gap:            8,
      overflowX:      'auto',
      background:     'rgba(10,15,25,0.9)',
    }}>
      {kpi.map(k => {
        const pct = k.tasks_total > 0
          ? Math.round((k.tasks_completed / k.tasks_total) * 100)
          : 0
        const color = agentColor(k.agent_id)
        return (
          <div key={k.agent_id} title={`${k.agent_id}: ${k.tasks_completed}/${k.tasks_total} tasks`}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 36 }}>
            {/* Ring */}
            <div style={{ position: 'relative', width: 28, height: 28 }}>
              <svg viewBox="0 0 28 28" width={28} height={28}>
                <circle cx={14} cy={14} r={11}
                  fill="none" stroke="#1e293b" strokeWidth={3} />
                <circle cx={14} cy={14} r={11}
                  fill="none"
                  stroke={color}
                  strokeWidth={3}
                  strokeDasharray={`${2 * Math.PI * 11}`}
                  strokeDashoffset={`${2 * Math.PI * 11 * (1 - pct / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 14 14)"
                  opacity={0.85}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 6, fontWeight: 700, color,
              }}>
                {pct}%
              </div>
            </div>
            <div style={{ fontSize: 7, color: '#64748b', textAlign: 'center', lineHeight: 1 }}>
              {k.agent_id.slice(0, 5)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export default function JanieChat({ onClose }: Props) {
  const [messages,      setMessages]      = useState<ChatMessage[]>([
    { id: uid(), role: 'janie', content: 'สวัสดีค่ะ คุณบีสาม 👋 มีอะไรให้ช่วยไหมคะ?\nพิมพ์คำสั่งหรืองานที่ต้องการ Janie จะประสานทีมให้เลยค่ะ', ts: Date.now() },
  ])
  const [input,         setInput]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [tasks,         setTasks]         = useState<TaskStatus[]>([])
  const [kpi,           setKpi]           = useState<KPIEntry[]>([])
  const [convId,        setConvId]        = useState<string | null>(null)
  const [polling,       setPolling]       = useState(false)

  const bottomRef   = useRef<HTMLDivElement>(null)
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Polling for task completion
  const startPolling = useCallback((id: string) => {
    setPolling(true)
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/janie/status?id=${id}`)
        const data = await res.json() as {
          tasks:          TaskStatus[]
          agent_messages: Record<string, string>
          all_done:       boolean
          conversation:   { summary?: string; status?: string }
          kpi:            KPIEntry[]
        }

        setTasks(data.tasks ?? [])
        if (data.kpi) setKpi(data.kpi)

        // Add new agent messages
        for (const [agentId, content] of Object.entries(data.agent_messages ?? {})) {
          setMessages(prev => {
            if (prev.some(m => m.agentId === agentId && m.role === 'agent')) return prev
            return [...prev, { id: uid(), role: 'agent', agentId, content, ts: Date.now() }]
          })
        }

        // Summary available
        if (data.conversation?.summary) {
          setMessages(prev => {
            if (prev.some(m => m.role === 'summary')) return prev
            return [...prev, {
              id: uid(), role: 'summary',
              content: data.conversation.summary!,
              ts: Date.now(),
            }]
          })
        }

        if (data.all_done || data.conversation?.status === 'done') {
          if (pollRef.current) clearInterval(pollRef.current)
          setPolling(false)

          // Trigger Raps HR update in background
          fetch('/api/hr/update-contexts', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ conversation_id: id }),
          }).catch(() => {})
        }
      } catch {
        // ignore poll errors
      }
    }, 2000)
  }, [])

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // Send message
  async function send() {
    const msg = input.trim()
    if (!msg || loading) return

    setInput('')
    setLoading(true)
    setTasks([])

    // Add user bubble
    setMessages(prev => [...prev, { id: uid(), role: 'user', content: msg, ts: Date.now() }])

    try {
      const res  = await fetch('/api/janie/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: msg }),
      })
      const data = await res.json() as {
        conversation_id?: string
        janie_ack?:       string
        agents_assigned?: string[]
        error?:           string
      }

      if (data.error) throw new Error(data.error)

      // Janie's ack
      if (data.janie_ack) {
        setMessages(prev => [...prev, {
          id:      uid(),
          role:    'janie',
          content: data.janie_ack!,
          ts:      Date.now(),
        }])
      }

      if (data.conversation_id) {
        setConvId(data.conversation_id)
        startPolling(data.conversation_id)
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id:      uid(),
        role:    'system',
        content: `⚠ เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'ไม่ทราบสาเหตุ'}`,
        ts:      Date.now(),
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{
        position:       'fixed',
        right:          16,
        top:            '50%',
        transform:      'translateY(-50%)',
        width:          360,
        maxHeight:      '85vh',
        display:        'flex',
        flexDirection:  'column',
        background:     'rgba(10,14,26,0.97)',
        border:         '1px solid rgba(99,102,241,0.3)',
        borderRadius:   16,
        boxShadow:      '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.1)',
        zIndex:         200,
        fontFamily:     'system-ui, sans-serif',
        backdropFilter: 'blur(20px)',
        overflow:       'hidden',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        padding:        '12px 14px',
        borderBottom:   '1px solid rgba(99,102,241,0.2)',
        display:        'flex',
        alignItems:     'center',
        gap:            10,
        background:     'linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%)',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0,
          boxShadow: '0 0 12px rgba(99,102,241,0.4)',
        }}>
          👩‍💼
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#c7d2fe' }}>Janie</div>
          <div style={{
            fontSize: 10, color: polling ? '#22c55e' : '#64748b',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {polling
              ? <><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'blink 1s ease-in-out infinite' }} /> กำลังประมวลผล...</>
              : <><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} /> พร้อมรับคำสั่ง</>
            }
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#475569', fontSize: 18, lineHeight: 1, padding: '2px 4px',
          }}
          title="ปิด"
        >
          ×
        </button>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex:       1,
        overflowY:  'auto',
        padding:    '12px 12px 4px',
        minHeight:  0,
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(99,102,241,0.2) transparent',
      }}>
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <Bubble key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>

        {/* Loading dots */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: 'flex', gap: 4, padding: '4px 0 8px 36px' }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                display: 'inline-block',
                width: 6, height: 6, borderRadius: '50%',
                background: '#818cf8',
                animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
              }} />
            ))}
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Task Tracker ── */}
      <AnimatePresence>
        {tasks.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <TaskTracker tasks={tasks} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KPI Strip ── */}
      <AnimatePresence>
        {kpi.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
          >
            <KPIStrip kpi={kpi} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input ── */}
      <div style={{
        padding:    '10px 12px',
        borderTop:  '1px solid rgba(255,255,255,0.06)',
        display:    'flex',
        gap:        8,
        alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="พิมพ์คำสั่งหรืองานที่ต้องการ... (Enter ส่ง, Shift+Enter ขึ้นบรรทัด)"
          rows={2}
          style={{
            flex:        1,
            background:  'rgba(255,255,255,0.04)',
            border:      '1px solid rgba(99,102,241,0.25)',
            borderRadius: 10,
            padding:     '8px 10px',
            fontSize:    12,
            color:       '#e2e8f0',
            resize:      'none',
            outline:     'none',
            fontFamily:  'system-ui, sans-serif',
            lineHeight:  1.5,
            scrollbarWidth: 'none',
          }}
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            padding:      '8px 14px',
            background:   loading || !input.trim()
              ? 'rgba(99,102,241,0.2)'
              : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            border:       'none',
            borderRadius: 10,
            color:        loading || !input.trim() ? '#475569' : '#fff',
            fontSize:     13,
            fontWeight:   600,
            cursor:       loading || !input.trim() ? 'not-allowed' : 'pointer',
            flexShrink:   0,
            transition:   'background 0.2s',
          }}
        >
          ส่ง
        </button>
      </div>

      {/* ── Animations CSS ── */}
      <style>{`
        @keyframes blink  { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
        @keyframes bounce { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-4px) } }
      `}</style>
    </motion.div>
  )
}
