'use client'

/**
 * TaskToast — notification เมื่อ task เสร็จ แสดงผลจริง
 * ดึงจาก agent_messages via Supabase Realtime
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Toast {
  id:      string
  agent:   string
  content: string
  at:      number
}

const AGENT_COLORS: Record<string, string> = {
  Janie:  '#818cf8', Joe: '#60a5fa', Enjoy: '#f472b6', Fenton: '#34d399',
  Karn:   '#fb923c', Nam: '#38bdf8', Metha: '#2dd4bf', Pim: '#facc15',
}
const agentColor = (a: string) => AGENT_COLORS[a] ?? '#94a3b8'

const AGENT_EMOJI: Record<string, string> = {
  Janie: '👩‍💼', Joe: '⚙️', Enjoy: '🎨', Fenton: '🔬', Karn: '📣',
  Kitti: '⚖️', Nara: '🎭', Metha: '📊', Pim: '📒', Win: '🚀',
  Nam: '💬', Kom: '🛡️', Raps: '📚', Ferin: '📦',
}

export default function TaskToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const channel = supabase
      .channel('task_toasts')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'agent_messages',
        filter: 'role=eq.agent',
      }, (payload) => {
        const msg = payload.new as { id: string; agent_id: string; content: string }
        const toast: Toast = {
          id:      msg.id,
          agent:   msg.agent_id,
          content: msg.content,
          at:      Date.now(),
        }
        setToasts(prev => [...prev.slice(-3), toast])  // keep max 4
        // Auto-dismiss after 8 seconds
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id))
        }, 8000)
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  return (
    <div style={{
      position:       'fixed',
      top:            60,
      left:           16,
      zIndex:         300,
      display:        'flex',
      flexDirection:  'column',
      gap:            8,
      maxWidth:       320,
      pointerEvents:  'none',
    }}>
      <AnimatePresence>
        {toasts.map(t => {
          const color = agentColor(t.agent)
          const emoji = AGENT_EMOJI[t.agent] ?? '🤖'
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0,   scale: 1    }}
              exit={{   opacity: 0, x: -20, scale: 0.95  }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                background:     'rgba(8,12,22,0.97)',
                border:         `1px solid ${color}40`,
                borderLeft:     `3px solid ${color}`,
                borderRadius:   10,
                padding:        '10px 14px',
                boxShadow:      `0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px ${color}15`,
                backdropFilter: 'blur(16px)',
                pointerEvents:  'auto',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color }}>{t.agent}</span>
                <span style={{ fontSize: 9, color: '#475569', marginLeft: 'auto' }}>เพิ่งตอบ</span>
              </div>
              {/* Content preview */}
              <div style={{
                fontSize:   11,
                color:      '#94a3b8',
                lineHeight: 1.5,
                display:    '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow:   'hidden',
              }}>
                {t.content}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
