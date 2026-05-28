'use client'

/**
 * LiveFeed — real-time activity ticker ที่ด้านล่างของ Room
 * ดึงจาก agent_logs via Supabase Realtime
 */

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface LogEntry {
  id:          string
  agent_name:  string
  action_desc: string
  status:      string
  created_at:  string
}

const AGENT_COLORS: Record<string, string> = {
  Janie:  '#818cf8', Joe:    '#60a5fa', Enjoy:  '#f472b6',
  Fenton: '#34d399', Karn:   '#fb923c', Kitti:  '#a78bfa',
  Nara:   '#f59e0b', Metha:  '#2dd4bf', Pim:    '#facc15',
  Win:    '#4ade80', Nam:    '#38bdf8', Kom:    '#f87171',
  Raps:   '#c084fc', Ferin:  '#fdba74', MidnightHunter: '#8b5cf6',
}

function agentColor(name: string) {
  return AGENT_COLORS[name] ?? '#64748b'
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  return `${Math.floor(diff / 3600000)}h`
}

export default function LiveFeed() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load recent logs on mount
  useEffect(() => {
    supabase
      .from('agent_logs')
      .select('id, agent_name, action_desc, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setLogs(data.reverse())
      })
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('room_live_feed')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'agent_logs',
      }, (payload) => {
        setLogs(prev => {
          const next = [...prev, payload.new as LogEntry].slice(-30)
          return next
        })
        // Auto-scroll to latest
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
          }
        }, 50)
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  if (!logs.length) return null

  return (
    <div style={{
      position:   'fixed',
      bottom:     0,
      left:       0,
      right:      0,
      zIndex:     50,
      background: 'rgba(3,7,18,0.92)',
      borderTop:  '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(12px)',
      padding:    '6px 12px',
      display:    'flex',
      alignItems: 'center',
      gap:        8,
    }}>
      {/* Label */}
      <div style={{ fontSize: 9, fontWeight: 700, color: '#22c55e', letterSpacing: 1, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s ease-in-out infinite' }} />
        LIVE
      </div>

      {/* Scrollable feed */}
      <div
        ref={scrollRef}
        style={{
          display:    'flex',
          gap:        16,
          overflowX:  'auto',
          flex:       1,
          scrollbarWidth: 'none',
          alignItems: 'center',
        }}
      >
        {logs.slice(-15).map(log => {
          const color = agentColor(log.agent_name)
          return (
            <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 0.3 }}>{log.agent_name}</span>
              <span style={{ fontSize: 9, color: '#334155' }}>›</span>
              <span style={{ fontSize: 10, color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {log.action_desc}
              </span>
              <span style={{ fontSize: 8, color: '#1e293b' }}>{timeAgo(log.created_at)}</span>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
      `}</style>
    </div>
  )
}
