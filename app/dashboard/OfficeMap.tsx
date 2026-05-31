'use client'

/**
 * OfficeMap — Top-Down RPG Style Office
 *
 * มุมมองจากบน เหมือน RPG เก่า
 * Layout 2 แถว desk + ทางเดินกลาง + common area
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SpriteCharacter, { type Direction, type WalkState } from './SpriteCharacter'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentTask {
  assigned_to: string
  status: 'pending' | 'in_progress' | 'done' | 'failed'
  task_detail: string
}

interface Pos { x: number; y: number }  // % of map

interface AgentState {
  id:         string
  pos:        Pos
  homePos:    Pos
  dir:        Direction
  walkState:  WalkState
  isWorking:  boolean
  _target?:   Pos
  _waypoints?: Pos[]  // queued path waypoints
}

// ─── Office Layout ────────────────────────────────────────────────────────────

// แถว A: ทีม Alpha (6 คน)  — desk y = 16%
// แถว B: ทีม Beta  (7 คน)  — desk y = 58%
// character ยืน/เดินเหนือ desk ประมาณ y = desk_y - 8%

const DESK_ROW_A_Y = 24   // % — character stand y row A
const DESK_ROW_B_Y = 62   // % — character stand y row B
const CORRIDOR_Y   = 44   // % — ทางเดินกลาง (ระหว่าง 2 แถว desk)

const HOME_POS: Record<string, Pos> = {
  // Row A — top desks
  Janie:  { x: 12, y: DESK_ROW_A_Y },
  Metha:  { x: 24, y: DESK_ROW_A_Y },
  Joe:    { x: 36, y: DESK_ROW_A_Y },
  Enjoy:   { x: 50, y: DESK_ROW_A_Y },
  Fenton: { x: 62, y: DESK_ROW_A_Y },
  Karn:   { x: 74, y: DESK_ROW_A_Y },
  Ferin:  { x: 86, y: DESK_ROW_A_Y },
  // Row B — bottom desks
  Kitti:  { x: 9,  y: DESK_ROW_B_Y },
  Nara:   { x: 21, y: DESK_ROW_B_Y },
  Pim:    { x: 33, y: DESK_ROW_B_Y },
  Win:    { x: 47, y: DESK_ROW_B_Y },
  Nam:    { x: 59, y: DESK_ROW_B_Y },
  Kom:    { x: 71, y: DESK_ROW_B_Y },
  Raps:   { x: 83, y: DESK_ROW_B_Y },
}

const WANDER_SPOTS: Pos[] = [
  { x: 5,  y: 44 },   // water cooler ซ้าย
  { x: 50, y: 44 },   // กลางทางเดิน
  { x: 88, y: 44 },   // printer ขวา
  { x: 28, y: 80 },   // coffee area
  { x: 65, y: 80 },   // sofa area
]

// ─── Desk tiles (visual only) ─────────────────────────────────────────────────

const DESKS_ROW_A = [
  { id: 'Janie', x: 9 }, { id: 'Metha', x: 21 }, { id: 'Joe', x: 33 },
  { id: 'Enjoy', x: 47 }, { id: 'Fenton', x: 59 }, { id: 'Karn', x: 71 },
  { id: 'Ferin', x: 83 },
]
const DESKS_ROW_B = [
  { id: 'Kitti', x: 6 }, { id: 'Nara', x: 18 }, { id: 'Pim', x: 30 },
  { id: 'Win', x: 44 }, { id: 'Nam', x: 56 }, { id: 'Kom', x: 68 }, { id: 'Raps', x: 80 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDir(from: Pos, to: Pos): Direction {
  const dx = to.x - from.x, dy = to.y - from.y
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')
}
function near(a: Pos, b: Pos) {
  return Math.abs(a.x - b.x) < 1.2 && Math.abs(a.y - b.y) < 1.2
}

/**
 * buildPath — สร้าง waypoints ที่เดินเป็นเส้นตรงแนวตั้งหรือแนวนอนเท่านั้น
 * เส้นทาง 3 ขา: (1) ตั้งฉากขึ้น/ลงไป corridor → (2) เดินซ้าย/ขวาใน corridor → (3) ตั้งฉากถึงจุดหมาย
 * ทำให้ flipX/sprite direction ทำงานถูกต้อง เพราะแต่ละขาเป็นแกนเดียว
 * Returns: [wpt1, wpt2?, destination]  — ต่อจาก from (ไม่รวม from)
 */
function buildPath(from: Pos, to: Pos): Pos[] {
  const inCorridor = (y: number) => Math.abs(y - CORRIDOR_Y) <= 5

  // ทั้งคู่อยู่ใน corridor แล้ว — เดินแนวนอนตรงๆ
  if (inCorridor(from.y) && inCorridor(to.y)) {
    return [to]
  }

  const sameCol = Math.abs(from.x - to.x) < 2  // เกือบตรงคอลัมน์เดียวกัน

  // จาก corridor ไป desk/break area — เดินแนวนอนใน corridor ก่อน แล้วลงตั้งฉาก
  if (inCorridor(from.y)) {
    if (sameCol) return [to]  // ตรงคอลัมน์ ลงตั้งฉากได้เลย
    return [{ x: to.x, y: from.y }, to]  // → ขวา/ซ้ายก่อน → ลง/ขึ้น
  }

  // จาก desk/break area ไป corridor — ขึ้น/ลง ตรงๆ ก่อน แล้วเดินแนวนอน
  if (inCorridor(to.y)) {
    const entry: Pos = { x: from.x, y: CORRIDOR_Y }
    if (sameCol) return [entry]  // ตรงคอลัมน์แล้ว ขึ้น/ลงเดียว
    return [entry, to]  // ขึ้น/ลงก่อน → เดินซ้าย/ขวาถึงจุดหมาย
  }

  // ทั้งคู่อยู่นอก corridor (desk row ↔ desk row หรือ desk ↔ break area)
  const entry:    Pos = { x: from.x, y: CORRIDOR_Y }
  const crossing: Pos = { x: to.x,   y: CORRIDOR_Y }
  if (sameCol) return [entry, to]   // ตั้งฉากขึ้น/ลง corridor แล้วตรงต่อไป
  return [entry, crossing, to]      // ตั้งฉาก → แนวนอน → ตั้งฉาก
}

// ─── Speech Bubble ────────────────────────────────────────────────────────────

function Bubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -4 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 4, zIndex: 50, pointerEvents: 'none' }}
    >
      <div style={{
        background: '#fff', color: '#111', fontSize: 8, fontWeight: 600,
        padding: '4px 8px', borderRadius: 8, maxWidth: 110, textAlign: 'center',
        lineHeight: 1.35, boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
        fontFamily: 'system-ui, sans-serif', whiteSpace: 'normal', wordBreak: 'break-word',
      }}>
        {text.length > 35 ? text.slice(0, 35) + '…' : text}
        <div style={{
          position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0, borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent', borderTop: '4px solid #fff',
        }} />
      </div>
    </motion.div>
  )
}

// ─── Desk Tile ────────────────────────────────────────────────────────────────

function DeskTile({ id, x, rowY, isWorking }: { id: string; x: number; rowY: number; isWorking: boolean }) {
  const zIndex = rowY < 30 ? 30 : 68  // Row A=30, Row B=68 — renders in front of characters at same Y
  return (
    <div style={{
      position: 'absolute',
      left: `${x}%`, top: `${rowY}%`,
      width: '11%', height: '16%',
      zIndex,
      // Premium White-Oak desk surface with glowing indicators
      background: isWorking
        ? 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 40%, #fde68a 60%, #f59e0b 100%)'
        : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 40%, #f1f5f9 60%, #e2e8f0 100%)',
      border: isWorking ? '1.5px solid #fb8500' : '1.5px solid #cbd5e1',
      borderRadius: 6,
      boxShadow: isWorking
        ? '0 0 15px rgba(251,133,0,0.35), 0 4px 8px rgba(0,0,0,0.15)'
        : '0 4px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflow: 'hidden',
    }}>
      {/* Wood grain lines (Light Oak) */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.08,
        backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(0,0,0,0.1) 9px)',
      }} />
      {/* Monitor — at TOP of desk */}
      <div style={{
        marginTop: '8%',
        width: '58%', height: '48%',
        background: isWorking ? '#0f172a' : '#f1f5f9',
        border: isWorking ? '1.5px solid #ff9f1c' : '1.5px solid #94a3b8',
        borderRadius: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        boxShadow: isWorking ? '0 0 10px rgba(255,159,28,0.45)' : '0 0 6px rgba(148,163,184,0.15)',
        zIndex: 1,
        flexShrink: 0,
      }}>
        {/* Screen glow */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 2,
          background: isWorking
            ? 'linear-gradient(135deg, rgba(255,159,28,0.18), rgba(251,133,0,0.08))'
            : 'linear-gradient(135deg, rgba(148,163,184,0.08), rgba(203,213,225,0.04))',
        }} />
        <div style={{ fontSize: 6, color: isWorking ? '#ff9f1c' : '#94a3b8', zIndex: 1, fontFamily: 'monospace', fontWeight: 'bold' }}>
          {isWorking ? '⚡' : '💤'}
        </div>
      </div>
      {/* Monitor stand */}
      <div style={{
        width: '18%', height: '6%',
        background: '#cbd5e1',
        marginTop: 1,
        borderRadius: '0 0 2px 2px',
        flexShrink: 0,
      }} />
      {/* Desk surface below monitor */}
      <div style={{
        flex: 1, width: '100%',
        background: isWorking
          ? 'linear-gradient(180deg, rgba(251,133,0,0.05) 0%, transparent 100%)'
          : 'transparent',
        position: 'relative',
      }}>
        {/* Keyboard hint */}
        <div style={{
          position: 'absolute', bottom: '22%', left: '50%',
          transform: 'translateX(-50%)',
          width: '45%', height: '14%',
          background: '#94a3b8',
          borderRadius: 2,
          opacity: 0.4,
        }} />
        {/* Name label */}
        <div style={{
          position: 'absolute', bottom: '4%', left: 0, right: 0,
          textAlign: 'center',
          fontSize: 7,
          fontWeight: 800,
          color: isWorking ? '#fb8500' : '#475569',
          letterSpacing: 0.5,
          fontFamily: 'system-ui, sans-serif',
          textShadow: '0 1px 1px rgba(255,255,255,0.8)',
          lineHeight: 1,
          userSelect: 'none',
        }}>{id}</div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  agentIds:     string[]
  tasks:        AgentTask[]
  speeches:     Record<string, string>
  onClickAgent: (id: string) => void
  spriteScale?: number
}

export default function OfficeMap({
  agentIds, tasks, speeches, onClickAgent, spriteScale = 0.85,
}: Props) {
  const [agents, setAgents] = useState<Record<string, AgentState>>(() => {
    const init: Record<string, AgentState> = {}
    agentIds.forEach(id => {
      const home = HOME_POS[id] ?? { x: 50, y: 44 }
      init[id] = { id, pos: { ...home }, homePos: home, dir: 'up', walkState: 'sit', isWorking: false }
    })
    return init
  })

  // Sync isWorking from tasks & immediately walk them back to desk when working (Game-like)
  useEffect(() => {
    setAgents(prev => {
      const next = { ...prev }
      let changed = false
      agentIds.forEach(id => {
        if (!next[id]) return
        const working = tasks.find(t => t.assigned_to === id)?.status === 'in_progress'
        const wasWorking = next[id].isWorking
        
        if (working !== wasWorking) {
          changed = true
          if (working) {
            // ถ้าเริ่มงานปุ๊บ ให้เดินกลับมาทำงานที่โต๊ะตัวเองทันทีเหมือนเกม
            const path = buildPath(next[id].pos, next[id].homePos)
            if (path.length > 0) {
              const [firstWpt, ...rest] = path
              next[id] = {
                ...next[id],
                isWorking: true,
                walkState: 'walk',
                dir: getDir(next[id].pos, firstWpt),
                _target: firstWpt,
                _waypoints: rest,
              }
            } else {
              next[id] = {
                ...next[id],
                isWorking: true,
                walkState: 'sit',
                dir: 'up',
                pos: { ...next[id].homePos },
                _target: undefined,
                _waypoints: [],
              }
            }
          } else {
            next[id] = { ...next[id], isWorking: false }
          }
        }
      })
      return changed ? next : prev
    })
  }, [tasks, agentIds])

  // Wander tick — ส่ง agent ออกไป wander โดยใช้ buildPath เดินเป็นขาตรง
  useEffect(() => {
    const iv = setInterval(() => {
      setAgents(prev => {
        // เลือก agent ที่ sit อยู่ที่บ้าน (ไม่ working) แบบสุ่ม
        const candidates = Object.values(prev).filter(a =>
          !a.isWorking && (a.walkState === 'sit' || a.walkState === 'idle') && Math.random() < 0.25
        )
        if (!candidates.length) return prev
        const agent = candidates[Math.floor(Math.random() * candidates.length)]
        const target = WANDER_SPOTS[Math.floor(Math.random() * WANDER_SPOTS.length)]
        const path = buildPath(agent.pos, target)
        const [firstWpt, ...rest] = path
        return {
          ...prev,
          [agent.id]: {
            ...agent,
            walkState:  'walk',
            dir:        getDir(agent.pos, firstWpt),
            _target:    firstWpt,
            _waypoints: rest,
          },
        }
      })
    }, 5000 + Math.random() * 4000)
    return () => clearInterval(iv)
  }, [])

  // Movement tick — เดินตาม waypoints ทีละขา (แนวตั้ง หรือ แนวนอนเท่านั้น)
  useEffect(() => {
    const mv = setInterval(() => {
      setAgents(prev => {
        const next = { ...prev }
        let changed = false
        Object.values(next).forEach(a => {
          if (a.walkState !== 'walk' || !a._target) return
          const dx = a._target.x - a.pos.x, dy = a._target.y - a.pos.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 1.2) {
            // ถึง waypoint นี้แล้ว — ดูว่ามี waypoint ถัดไปไหม
            const waypoints = a._waypoints ?? []
            if (waypoints.length > 0) {
              const [nextWpt, ...rest] = waypoints
              next[a.id] = {
                ...a,
                pos:        { ...a._target },
                _target:    nextWpt,
                _waypoints: rest,
                dir:        getDir(a._target, nextWpt),
              }
            } else {
              // ถึงจุดหมายสุดท้าย
              const isHome = near(a._target, a.homePos)
              next[a.id] = {
                ...a,
                pos:        { ...a._target },
                walkState:  isHome ? 'sit'  : 'idle',  // 'sit' เฉพาะที่โต๊ะตัวเอง
                dir:        isHome ? 'up'   : 'down',  // หันหน้าเข้าโต๊ะ / หันหน้ามา
                _target:    undefined,
                _waypoints: [],
              }
              if (!isHome && !a.isWorking) {
                // นั่ง wander ชั่วคราว แล้วกลับบ้าน
                setTimeout(() => {
                  setAgents(p => {
                    const curr = p[a.id]
                    if (!curr || curr.walkState === 'walk') return p
                    // กลับโต๊ะผ่าน corridor
                    const path = buildPath(curr.pos, curr.homePos)
                    const [firstWpt, ...rest] = path
                    return {
                      ...p,
                      [curr.id]: {
                        ...curr,
                        walkState:  'walk',
                        dir:        getDir(curr.pos, firstWpt),
                        _target:    firstWpt,
                        _waypoints: rest,
                      },
                    }
                  })
                }, 3000 + Math.random() * 4000)
              }
            }
          } else {
            // กำลังเดิน — เลื่อน pos ไปทิศ target (pure vertical หรือ pure horizontal)
            const speed = 0.6
            next[a.id] = {
              ...a,
              pos: {
                x: a.pos.x + (dx / dist) * speed,
                y: a.pos.y + (dy / dist) * speed,
              },
              dir: getDir(a.pos, a._target),
            }
          }
          changed = true
        })
        return changed ? next : prev
      })
    }, 80)
    return () => clearInterval(mv)
  }, [])

  const workingIds = new Set(Object.values(agents).filter(a => a.isWorking).map(a => a.id))

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      // Bright Premium Light-Oak/Beige Modern co-working floor
      background: '#f8fafc',
      overflow: 'hidden',
      backgroundImage: `
        linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px),
        radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.04) 0%, transparent 60%),
        radial-gradient(ellipse at 50% 70%, rgba(14,165,233,0.03) 0%, transparent 60%)
      `,
      backgroundSize: '48px 48px, 48px 48px, 100% 100%, 100% 100%',
    }}>

      {/* ── Walls ── */}
      <div style={{
        position: 'absolute', inset: 0,
        border: '2px solid #cbd5e1',
        boxShadow: 'inset 0 0 30px rgba(148,163,184,0.15)',
        borderRadius: 4,
        pointerEvents: 'none',
      }} />

      {/* ── Wall top decorations ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '8%',
        background: 'linear-gradient(180deg, #f1f5f9 0%, transparent 100%)',
        borderBottom: '1px solid #cbd5e1',
        display: 'flex', alignItems: 'center', paddingLeft: 12, gap: 8,
      }}>
        <div style={{ fontSize: 8, color: '#64748b', letterSpacing: 2, fontWeight: 700 }}>B3 TEAM AVENGER — FLOOR 4</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 8, color: '#10b98144' }}>🌿 🌿</div>
      </div>

      {/* ── Corridor label ── */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: '43%', height: '14%',
        background: 'linear-gradient(180deg, transparent, rgba(241,245,249,0.5) 50%, transparent)',
        borderTop: '1px solid rgba(203,213,225,0.4)',
        borderBottom: '1px solid rgba(203,213,225,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 3%',
        pointerEvents: 'none',
      }}>
        {/* Water cooler */}
        <div style={{ fontSize: 14, opacity: 0.7 }}>🚰</div>
        {/* Center corridor label */}
        <div style={{ fontSize: 7, color: '#64748b', letterSpacing: 3, fontWeight: 700 }}>· · · CORRIDOR · · ·</div>
        {/* Printer */}
        <div style={{ fontSize: 14, opacity: 0.7 }}>🖨️</div>
      </div>

      {/* ── Common area bottom ── */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '10%',
        background: 'linear-gradient(0deg, #f1f5f9 0%, transparent 100%)',
        borderTop: '1px solid #cbd5e1',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 12, opacity: 0.6 }}>☕</div>
        <div style={{ fontSize: 7, color: '#64748b', letterSpacing: 2, fontWeight: 700 }}>BREAK AREA</div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>🛋️</div>
      </div>

      {/* ── Row A Desks ── */}
      {DESKS_ROW_A.map(d => (
        <DeskTile key={d.id} id={d.id} x={d.x} rowY={9} isWorking={workingIds.has(d.id)} />
      ))}

      {/* ── Row B Desks ── */}
      {DESKS_ROW_B.map(d => (
        <DeskTile key={d.id} id={d.id} x={d.x} rowY={54} isWorking={workingIds.has(d.id)} />
      ))}

      {/* ── Characters ── */}
      {Object.values(agents).map(a => (
        <div
          key={a.id}
          onClick={() => onClickAgent(a.id)}
          style={{
            position: 'absolute',
            left: `${a.pos.x}%`,
            top:  `${a.pos.y}%`,
            transform: 'translate(-50%, -100%)',
            zIndex: Math.round(a.pos.y),   // z-order by Y (closer = on top)
            cursor: 'pointer',
          }}
        >
          <div style={{ position: 'relative' }}>
            {/* Speech bubble */}
            <AnimatePresence>
              {speeches[a.id] && <Bubble key={speeches[a.id].slice(0, 15)} text={speeches[a.id]} />}
            </AnimatePresence>

            {/* Working fire */}
            {a.isWorking && (
              <div style={{
                position: 'absolute', top: -6, right: -4, fontSize: 9,
                animation: 'sprite-bob 0.4s ease-in-out infinite alternate', zIndex: 5,
              }}>🔥</div>
            )}

            <SpriteCharacter
              id={a.id} direction={a.dir} state={a.walkState}
              scale={spriteScale} isWorking={a.isWorking}
            />

            {/* Name */}
            <div style={{
              textAlign: 'center', fontSize: 7, fontWeight: 800, marginTop: 1,
              color: a.isWorking ? '#fb8500' : '#334155',
              textShadow: '0 1px 2px rgba(255,255,255,0.8)',
              lineHeight: 1,
            }}>{a.id}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

