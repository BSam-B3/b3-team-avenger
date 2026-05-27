'use client'

/**
 * /room — ห้องทำงานส่วนตัวของ B3
 *
 * Layout:
 *   • B3 (boss)   — โต๊ะใหญ่ด้านหลัง
 *   • Janie       — โต๊ะเลขาด้านหน้า + chat panel
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import SpriteCharacter from '../dashboard/SpriteCharacter'
import JanieChat from './JanieChat'
import UsagePanel from './UsagePanel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bubble {
  id:   string
  text: string
}

// ─── Boss Avatar (B3) ────────────────────────────────────────────────────────
// ใช้ gold initials จนกว่าจะมี portrait/sprite

function BossAvatar({
  size    = 64,
  onClick,
  glowing = false,
}: {
  size?:    number
  onClick?: () => void
  glowing?: boolean
}) {
  return (
    <div
      onClick={onClick}
      title="B3"
      style={{
        width:        size,
        height:       size,
        borderRadius: '50%',
        background:   'linear-gradient(135deg, #b45309 0%, #78350f 100%)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        fontSize:     size * 0.32,
        fontWeight:   900,
        color:        '#fef3c7',
        cursor:       onClick ? 'pointer' : 'default',
        letterSpacing: -1,
        userSelect:   'none',
        boxShadow:    glowing
          ? '0 0 0 2px #f59e0b, 0 0 24px rgba(245,158,11,0.5), 0 4px 12px rgba(0,0,0,0.6)'
          : '0 0 0 2px rgba(245,158,11,0.3), 0 4px 12px rgba(0,0,0,0.5)',
        transition:   'box-shadow 0.3s',
        flexShrink:   0,
      }}
    >
      B3
    </div>
  )
}

// ─── Furniture pieces ─────────────────────────────────────────────────────────

/** โต๊ะ boss — มหึมา, สี mahogany เข้ม */
function BossDesk() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* desk surface */}
      <div style={{
        position:   'absolute',
        inset:      0,
        background: 'linear-gradient(to bottom, #3d200a 0%, #2a1505 60%)',
        borderRadius: 6,
        boxShadow:  '0 6px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,200,80,0.12)',
        border:     '1px solid #5c3010',
      }} />
      {/* desk edge (3D effect) */}
      <div style={{
        position:   'absolute',
        bottom:     -6, left: 4, right: 4, height: 8,
        background: '#1a0e04',
        borderRadius: '0 0 4px 4px',
      }} />
      {/* monitor */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '18%',
        transform: 'translateX(-50%)',
        width: '28%', height: '55%',
        background: '#0a0a0f',
        border: '2px solid #334155',
        borderRadius: 4,
        boxShadow: '0 0 12px rgba(59,130,246,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* screen glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(16,185,129,0.08) 100%)',
        }} />
        <span style={{ fontSize: 10, color: '#60a5fa', zIndex: 1, fontFamily: 'monospace' }}>
          ▪▪▪
        </span>
      </div>
      {/* nameplate */}
      <div style={{
        position: 'absolute',
        right: '10%', bottom: '15%',
        width: '22%', height: '18%',
        background: 'linear-gradient(135deg, #92400e, #78350f)',
        border: '1px solid #d97706',
        borderRadius: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 7, color: '#fde68a', fontWeight: 700, letterSpacing: 1 }}>
          B3
        </span>
      </div>
      {/* papers stack */}
      <div style={{
        position: 'absolute',
        left: '8%', bottom: '12%',
        width: '18%', height: '22%',
        background: '#f8fafc',
        borderRadius: 2,
        transform: 'rotate(-3deg)',
        boxShadow: '1px 1px 0 #e2e8f0, 2px 2px 0 #cbd5e1',
        opacity: 0.85,
      }} />
    </div>
  )
}

/** โต๊ะ Janie — เรียบร้อย, มี plant เล็ก */
function SecretaryDesk() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{
        position:   'absolute',
        inset:      0,
        background: 'linear-gradient(to bottom, #1e293b 0%, #0f172a 60%)',
        borderRadius: 5,
        boxShadow:  '0 4px 14px rgba(0,0,0,0.6), inset 0 1px 0 rgba(148,163,184,0.1)',
        border:     '1px solid #334155',
      }} />
      <div style={{
        position: 'absolute',
        bottom: -5, left: 3, right: 3, height: 6,
        background: '#0a0f1a',
        borderRadius: '0 0 3px 3px',
      }} />
      {/* laptop */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '15%',
        transform: 'translateX(-50%)',
        width: '30%', height: '48%',
        background: '#1c1c1e',
        border: '1.5px solid #374151',
        borderRadius: 3,
        boxShadow: '0 0 8px rgba(99,102,241,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(16,185,129,0.06) 100%)',
        }} />
        <span style={{ fontSize: 8, color: '#818cf8', fontFamily: 'monospace' }}>💬</span>
      </div>
      {/* mini plant */}
      <div style={{
        position: 'absolute',
        right: '8%', top: '10%',
        fontSize: 14,
        lineHeight: 1,
      }}>🪴</div>
      {/* sticky notes */}
      <div style={{
        position: 'absolute',
        left: '6%', top: '18%',
        width: '18%', height: '22%',
        background: '#fde68a',
        borderRadius: 2,
        opacity: 0.8,
        transform: 'rotate(2deg)',
      }} />
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function PrivateRoom() {
  const [bubble,       setBubble]      = useState<Bubble | null>(null)
  const [time,         setTime]        = useState('')
  const [janieLooking, setJanieLooking] = useState(false)
  const [chatOpen,     setChatOpen]    = useState(false)
  const [usageOpen,    setUsageOpen]   = useState(false)

  // clock
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const t = setInterval(tick, 10000)
    return () => clearInterval(t)
  }, [])

  function showBubble(id: string, text: string, ms = 4000) {
    setBubble({ id, text })
    setTimeout(() => setBubble(null), ms)
  }

  function handleClickB3() {
    showBubble('B3', 'กำลังคิดแผนอยู่...', 3000)
  }

  function handleClickJanie() {
    setJanieLooking(true)
    if (!chatOpen) {
      showBubble('Janie', 'ค่ะ มีอะไรให้ช่วยไหมคะ? 💬', 2000)
      setTimeout(() => { setChatOpen(true); setJanieLooking(false) }, 400)
    } else {
      setJanieLooking(false)
      setChatOpen(false)
    }
  }

  return (
    <div style={{
      background: '#030712',
      minHeight:  '100vh',
      display:    'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding:    '16px 16px 32px',
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* ── Top bar ── */}
      <div style={{
        width:          '100%',
        maxWidth:       960,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/dashboard" style={{
            fontSize: 11, color: '#64748b', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            ← Office
          </Link>
          <span style={{ color: '#1e293b' }}>│</span>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
            🏢 ห้องผู้บริหาร
          </span>
          <span style={{ color: '#1e293b' }}>│</span>
          <Link href="/history" style={{
            fontSize: 11, color: '#f59e0b', textDecoration: 'none', fontWeight: 600,
          }}>
            📋 ประวัติ
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setUsageOpen(true)}
            title="API Usage Dashboard"
            style={{
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 6, color: '#f59e0b', padding: '4px 10px',
              cursor: 'pointer', fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
              transition: 'all 0.15s',
            }}
          >
            📊 Usage
          </button>
          <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>
            {time}
          </div>
        </div>
      </div>

      {/* ── Room container ── */}
      <div style={{
        position:     'relative',
        width:        '100%',
        maxWidth:     960,
        aspectRatio:  '16 / 10',
        borderRadius: 12,
        overflow:     'hidden',
        boxShadow:    '0 25px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
      }}>

        {/* ── Floor ── */}
        <div style={{
          position: 'absolute', inset: 0,
          background: '#0c1220',
          backgroundImage: [
            'repeating-linear-gradient(0deg,   transparent, transparent 39px, rgba(255,255,255,0.025) 40px)',
            'repeating-linear-gradient(90deg,  transparent, transparent 39px, rgba(255,255,255,0.025) 40px)',
          ].join(', '),
        }} />

        {/* ── Carpet (boss area) ── */}
        <div style={{
          position: 'absolute',
          left: '18%', top: '14%',
          width: '64%', height: '46%',
          background: 'radial-gradient(ellipse at center, rgba(120,53,15,0.18) 0%, rgba(120,53,15,0.06) 70%, transparent 100%)',
          borderRadius: '50%',
        }} />

        {/* ── Back wall ── */}
        <div style={{
          position: 'absolute',
          left: 0, top: 0, right: 0, height: '22%',
          background: 'linear-gradient(to bottom, #0a0f1a 0%, #0c1220 100%)',
          borderBottom: '2px solid rgba(255,255,255,0.04)',
        }} />

        {/* ── Window ── */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '2%',
          transform: 'translateX(-50%)',
          width: '28%', height: '16%',
          background: 'linear-gradient(to bottom, #1e3a5f 0%, #0f2748 60%, #081828 100%)',
          border: '2px solid #1e3a5f',
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 0 30px rgba(59,130,246,0.12), inset 0 0 20px rgba(59,130,246,0.06)',
        }}>
          {/* window cross */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: 'rgba(255,255,255,0.08)' }} />
          {/* city lights */}
          {[
            { l: '15%', t: '20%', c: '#fde68a' }, { l: '25%', t: '65%', c: '#93c5fd' },
            { l: '60%', t: '30%', c: '#fde68a' }, { l: '75%', t: '60%', c: '#a78bfa' },
            { l: '40%', t: '70%', c: '#fde68a' }, { l: '85%', t: '25%', c: '#6ee7b7' },
          ].map((star, i) => (
            <div key={i} style={{
              position: 'absolute', left: star.l, top: star.t,
              width: 3, height: 3, borderRadius: '50%',
              background: star.c, boxShadow: `0 0 4px ${star.c}`,
            }} />
          ))}
        </div>

        {/* ── Bookshelf (left) ── */}
        <div style={{
          position: 'absolute',
          left: '4%', top: '2%',
          width: '10%', height: '18%',
          background: '#1a1008',
          border: '1px solid #3d2010',
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          padding: 3,
          gap: 2,
          overflow: 'hidden',
        }}>
          {[
            ['#dc2626','#2563eb'], ['#16a34a','#7c3aed'], ['#ca8a04','#0891b2'],
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', gap: 2, flex: 1 }}>
              {row.map((c, j) => (
                <div key={j} style={{ flex: 1, background: c, borderRadius: 1, opacity: 0.75 }} />
              ))}
            </div>
          ))}
        </div>

        {/* ── Plant (right corner) ── */}
        <div style={{
          position: 'absolute',
          right: '4%', top: '3%',
          fontSize: 24, lineHeight: 1,
        }}>
          🪴
        </div>

        {/* ── Boss Desk ── */}
        <div style={{
          position: 'absolute',
          left: '22%', top: '18%',
          width: '56%', height: '18%',
          zIndex: 5,
        }}>
          <BossDesk />
        </div>

        {/* ── B3 Character — ชิดใต้ desk, หันหน้าขึ้นหาโต๊ะ ── */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '34%',   /* ← ใต้ boss desk */
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          zIndex: 10,
        }}>
          <BossAvatar size={52} onClick={handleClickB3} glowing={bubble?.id === 'B3'} />

          {/* Name label */}
          <div style={{
            fontSize: 9, fontWeight: 700, color: '#f59e0b',
            letterSpacing: 1, textTransform: 'uppercase',
          }}>
            B3
          </div>

          {/* Speech bubble B3 — อยู่ใต้ชื่อ */}
          <AnimatePresence>
            {bubble?.id === 'B3' && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.9 }}
                style={{
                  background: 'rgba(15,20,40,0.95)',
                  border: '1px solid rgba(245,158,11,0.4)',
                  borderRadius: 10,
                  padding: '6px 10px',
                  fontSize: 11,
                  color: '#fde68a',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  marginTop: 2,
                }}
              >
                {bubble.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Secretary Desk ── */}
        <div style={{
          position: 'absolute',
          left: '28%', top: '56%',
          width: '36%', height: '14%',
          zIndex: 5,
        }}>
          <SecretaryDesk />
        </div>

        {/* ── Janie Character — ชิดใต้ secretary desk, หันหน้าขึ้น ── */}
        <div style={{
          position: 'absolute',
          left: '40%', top: '69%',   /* ← ใต้ secretary desk */
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          zIndex: 10,
        }}>
          <SpriteCharacter
            id="Janie"
            direction="up"
            state="idle"
            scale={0.75}
            isWorking={false}
            onClick={handleClickJanie}
          />

          <div style={{
            fontSize: 9, fontWeight: 700, color: '#818cf8',
            letterSpacing: 1,
          }}>
            Janie
          </div>

          {/* Speech bubble Janie — อยู่ใต้ชื่อ */}
          <AnimatePresence>
            {bubble?.id === 'Janie' && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.9 }}
                style={{
                  background: 'rgba(15,20,40,0.95)',
                  border: '1px solid rgba(99,102,241,0.4)',
                  borderRadius: 10,
                  padding: '6px 10px',
                  fontSize: 11,
                  color: '#c7d2fe',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  marginTop: 2,
                }}
              >
                {bubble.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Sofa / lounge (ซ้าย ระหว่าง 2 desk) ── */}
        <div style={{
          position: 'absolute',
          left: '5%', top: '48%',
          width: '13%', height: '7%',
          background: 'linear-gradient(to bottom, #1e1b4b 0%, #12104a 100%)',
          borderRadius: '4px 4px 0 0',
          border: '1px solid #312e81',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 9, color: '#6366f1', opacity: 0.6 }}>🛋️</span>
        </div>

        {/* ── Plant (ขวา ระหว่าง 2 desk) ── */}
        <div style={{
          position: 'absolute',
          right: '5%', top: '46%',
          fontSize: 20, lineHeight: 1,
        }}>
          🌿
        </div>

        {/* ── Door — ล่างกลาง (ทางเข้าห้อง) ── */}
        <div style={{
          position: 'absolute',
          left: '50%', bottom: 0,
          transform: 'translateX(-50%)',
          width: '12%', height: '8%',
          background: '#1a1008',
          borderTop: '2px solid #3d2010',
          borderLeft: '1px solid #3d2010',
          borderRight: '1px solid #3d2010',
          borderRadius: '3px 3px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          paddingRight: '15%',
          zIndex: 2,
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#d97706', boxShadow: '0 0 4px rgba(217,119,6,0.5)',
          }} />
        </div>

        {/* ── Ambient light (from window at top) ── */}
        <div style={{
          position: 'absolute',
          left: '50%', top: 0,
          transform: 'translateX(-50%)',
          width: '32%', height: '55%',
          background: 'radial-gradient(ellipse at top, rgba(59,130,246,0.05) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

      </div>

      {/* ── Bottom hint ── */}
      <div style={{
        marginTop: 14,
        display: 'flex',
        gap: 20,
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: '#334155' }}>
          คลิก <span style={{ color: '#818cf8', fontWeight: 700 }}>Janie</span> เพื่อเปิด Command Center
        </span>
        <span style={{ fontSize: 10, color: '#1e293b' }}>•</span>
        <span style={{ fontSize: 10, color: chatOpen ? '#818cf8' : '#334155' }}>
          {chatOpen ? '💬 Chat เปิดอยู่' : '💬 คลิก Janie เพื่อสั่งงาน'}
        </span>
      </div>

      {/* ── Janie Chat Panel ── */}
      <AnimatePresence>
        {chatOpen && <JanieChat onClose={() => setChatOpen(false)} />}
      </AnimatePresence>

      {/* ── Usage Panel ── */}
      <AnimatePresence>
        {usageOpen && <UsagePanel onClose={() => setUsageOpen(false)} />}
      </AnimatePresence>

    </div>
  )
}
