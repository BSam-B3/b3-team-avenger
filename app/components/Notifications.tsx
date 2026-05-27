'use client'

/**
 * Notifications
 *
 * Self-contained component that subscribes to agent_tasks Realtime events.
 * Displays toast notifications (bottom-right) when a task goes 'done'.
 *
 * Features:
 *   • Framer-motion enter/exit animations (slide up + fade)
 *   • Multiple toasts stacked vertically
 *   • Auto-dismiss after 4 seconds
 *   • Manual dismiss with ✕ button
 *   • Dark theme: rgba(15,20,40,0.95) background, gold border
 *
 * Usage (drop into layout or any page):
 *   <Notifications />
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useAgentNotifications, AgentToast } from '@/app/hooks/useAgentNotifications'

// ─── Agent accent colours (same map as history page) ─────────────────────────

const AGENT_COLORS: Record<string, string> = {
  Janie:  '#818cf8', Joe:   '#60a5fa', Enjoy:  '#f472b6',
  Fenton: '#34d399', Karn:  '#fb923c', Kitti:  '#a78bfa',
  Nara:   '#f59e0b', Metha: '#2dd4bf', Pim:    '#facc15',
  Win:    '#4ade80', Nam:   '#38bdf8', Kom:    '#f87171',
  Raps:   '#c084fc', Ferin: '#fdba74',
}

// ─── Single Toast ─────────────────────────────────────────────────────────────

function Toast({ toast, onDismiss }: { toast: AgentToast; onDismiss: (id: string) => void }) {
  const accentColor = AGENT_COLORS[toast.agentId] ?? '#f59e0b'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: 8,  scale: 0.95, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      style={{
        position:   'relative',
        width:      320,
        background: 'rgba(15,20,40,0.95)',
        border:     `1px solid ${accentColor}55`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 10,
        padding:    '12px 38px 12px 14px',
        boxShadow:  '0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        cursor:     'default',
        userSelect: 'none',
      }}
    >
      {/* Header: agent name + "task done" */}
      <div style={{
        display:    'flex',
        alignItems: 'center',
        gap:        8,
        marginBottom: 5,
      }}>
        {/* Agent dot */}
        <div style={{
          width:        8,
          height:       8,
          borderRadius: '50%',
          background:   accentColor,
          flexShrink:   0,
          boxShadow:    `0 0 6px ${accentColor}88`,
        }} />
        <span style={{
          fontSize:   12,
          fontWeight: 700,
          color:      accentColor,
        }}>
          {toast.agentId}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          เสร็จแล้ว ✅
        </span>
      </div>

      {/* Task snippet */}
      {toast.taskSnip && (
        <div style={{
          fontSize:   11,
          color:      'rgba(255,255,255,0.65)',
          lineHeight: 1.5,
          wordBreak:  'break-word',
        }}>
          {toast.taskSnip}{toast.taskSnip.length >= 60 ? '…' : ''}
        </div>
      )}

      {/* Progress bar (auto-dismiss indicator) */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 4, ease: 'linear' }}
        style={{
          position:       'absolute',
          bottom:         0,
          left:           0,
          right:          0,
          height:         2,
          background:     accentColor,
          borderRadius:   '0 0 10px 10px',
          transformOrigin: 'left',
          opacity:        0.5,
        }}
      />

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          position:   'absolute',
          top:        8,
          right:      8,
          background: 'rgba(255,255,255,0.06)',
          border:     'none',
          borderRadius: 4,
          color:      'rgba(255,255,255,0.4)',
          fontSize:   11,
          lineHeight: 1,
          padding:    '3px 5px',
          cursor:     'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Notifications() {
  const { toasts, dismiss } = useAgentNotifications()

  return (
    <div
      style={{
        position:       'fixed',
        bottom:         24,
        right:          20,
        zIndex:         9999,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'flex-end',
        gap:            8,
        pointerEvents:  toasts.length === 0 ? 'none' : 'auto',
      }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}
