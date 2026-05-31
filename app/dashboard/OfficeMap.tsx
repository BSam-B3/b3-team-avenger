'use client'

/**
 * OfficeMap — Cozy Pixel Dream Games Style Office
 * 
 * Redesigned to match the bright, warm, and highly detailed isometric pixel-art co-working space:
 * - Sunny skyscraper city window view on the left
 * - Glowing 'EAT SLEEP CODE REPEAT' neon sign and 'GAME PLAN' whiteboard
 * - Cozy Lofi lounge/sofa area with TV on the bottom-right
 * - Scattered wooden desks with warm screen glows and coffee mugs
 * - Realistic pathfinding and desk-sitting behavior when working
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SpriteCharacter, { type Direction, type WalkState } from './SpriteCharacter'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentTask {
  assigned_to: string
  status: 'pending' | 'in_progress' | 'done' | 'failed'
  task_detail: string
}

interface Pos { x: number; y: number }

interface AgentState {
  id:         string
  pos:        Pos
  homePos:    Pos
  dir:        Direction
  walkState:  WalkState
  isWorking:  boolean
  _target?:   Pos
  _waypoints?: Pos[]
}

// ─── Cozy Office Coordinates ──────────────────────────────────────────────────

// We distribute 21 agents beautifully around the cozy studio
const HOME_POS: Record<string, Pos> = {
  // Left Row (Near the big sunny window)
  Janie:  { x: 14, y: 22 },
  Joe:    { x: 14, y: 38 },
  Enjoy:  { x: 14, y: 54 },
  Fenton: { x: 26, y: 22 },
  Karn:   { x: 26, y: 38 },

  // Center-Left Row (Creative & Tech Hub)
  Kitti:  { x: 38, y: 22 },
  Nara:   { x: 38, y: 38 },
  Pim:    { x: 38, y: 54 },
  Win:    { x: 50, y: 22 },
  Nam:    { x: 50, y: 38 },

  // Center-Right Row (Ops & Finance Hub)
  Kom:    { x: 62, y: 22 },
  Raps:   { x: 62, y: 38 },
  Ferin:  { x: 62, y: 54 },
  Non:    { x: 74, y: 22 },
  Mena:   { x: 74, y: 38 },

  // Right Exec Row (Close to the whiteboard & lounge)
  Qara:   { x: 86, y: 22 },
  Dana:   { x: 86, y: 38 },
  Chief:  { x: 86, y: 54 },
  Finley: { x: 74, y: 54 },
  Sec:    { x: 50, y: 54 },
  Exploiter: { x: 26, y: 54 },
}

// Cozy walk targets
const WANDER_SPOTS: Pos[] = [
  { x: 8,  y: 76 },   // Water Cooler (Left)
  { x: 48, y: 44 },   // Central Corridor
  { x: 88, y: 76 },   // Lofi Lounge Area (Right)
  { x: 74, y: 76 },   // Sofa Area
  { x: 50, y: 76 },   // Bookcases
]

const CORRIDOR_Y = 44

function getDir(from: Pos, to: Pos): Direction {
  const dx = to.x - from.x, dy = to.y - from.y
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')
}
function near(a: Pos, b: Pos) {
  return Math.abs(a.x - b.x) < 1.2 && Math.abs(a.y - b.y) < 1.2
}

function buildPath(from: Pos, to: Pos): Pos[] {
  const inCorridor = (y: number) => Math.abs(y - CORRIDOR_Y) <= 5
  if (inCorridor(from.y) && inCorridor(to.y)) return [to]
  const sameCol = Math.abs(from.x - to.x) < 2
  if (inCorridor(from.y)) {
    if (sameCol) return [to]
    return [{ x: to.x, y: from.y }, to]
  }
  if (inCorridor(to.y)) {
    const entry: Pos = { x: from.x, y: CORRIDOR_Y }
    if (sameCol) return [entry]
    return [entry, to]
  }
  const entry:    Pos = { x: from.x, y: CORRIDOR_Y }
  const crossing: Pos = { x: to.x,   y: CORRIDOR_Y }
  if (sameCol) return [entry, to]
  return [entry, crossing, to]
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
        background: '#fff', color: '#111', fontSize: 8, fontWeight: 700,
        padding: '5px 10px', borderRadius: 10, maxWidth: 110, textAlign: 'center',
        lineHeight: 1.35, boxShadow: '0 3px 10px rgba(0,0,0,0.25)',
        fontFamily: 'system-ui, sans-serif', whiteSpace: 'normal', wordBreak: 'break-word',
        border: '1px solid #cbd5e1',
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


// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  agentIds:     string[]
  tasks:        AgentTask[]
  speeches:     Record<string, string>
  onClickAgent: (id: string) => void
  spriteScale?: number
}

export default function OfficeMap({
  agentIds, tasks, speeches, onClickAgent, spriteScale = 0.65,
}: Props) {
  const [agents, setAgents] = useState<Record<string, AgentState>>(() => {
    const init: Record<string, AgentState> = {}
    agentIds.forEach(id => {
      const home = HOME_POS[id] ?? { x: 50, y: 44 }
      init[id] = { id, pos: { ...home }, homePos: home, dir: 'up', walkState: 'sit', isWorking: false }
    })
    return init
  })

  // Sync isWorking & walk back to desk dynamically (Game-like behavior)
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
            // Walk back home immediately
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

  // Wander Tick
  useEffect(() => {
    const iv = setInterval(() => {
      setAgents(prev => {
        const candidates = Object.values(prev).filter(a =>
          !a.isWorking && (a.walkState === 'sit' || a.walkState === 'idle') && Math.random() < 0.2
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
    }, 6000 + Math.random() * 4000)
    return () => clearInterval(iv)
  }, [])

  // Movement Tick
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
              const isHome = near(a._target, a.homePos)
              next[a.id] = {
                ...a,
                pos:        { ...a._target },
                walkState:  isHome ? 'sit'  : 'idle',
                dir:        isHome ? 'up'   : 'down',
                _target:    undefined,
                _waypoints: [],
              }
              if (!isHome && !a.isWorking) {
                // Return home after lounging
                setTimeout(() => {
                  setAgents(p => {
                    const curr = p[a.id]
                    if (!curr || curr.walkState === 'walk') return p
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
                }, 4000 + Math.random() * 4000)
              }
            }
          } else {
            const speed = 0.55
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
      // Warm Cozy Walnut parquet floor base
      background: '#2b1810',
      overflow: 'hidden',
      backgroundImage: `
        linear-gradient(rgba(0,0,0,0.15) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,0,0,0.15) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
    }}>
      
      {/* ── Giant City Scraper Window (Left Wall) ── */}
      <div style={{
        position: 'absolute',
        left: '2%', top: '4%',
        width: '28%', height: '32%',
        background: 'linear-gradient(180deg, #60a5fa 0%, #93c5fd 60%, #cbd5e1 100%)',
        border: '3.5px solid #4a3728',
        borderRadius: 4,
        boxShadow: 'inset 0 0 15px rgba(255,255,255,0.4), 0 4px 10px rgba(0,0,0,0.4)',
        zIndex: 5,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        overflow: 'hidden',
      }}>
        {/* Pixel Skyscrapers */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', paddingLeft: 4, opacity: 0.75 }}>
          <div style={{ width: 14, height: 45, background: '#475569', borderRadius: '2px 2px 0 0' }} />
          <div style={{ width: 18, height: 65, background: '#334155', borderRadius: '2px 2px 0 0' }} />
          <div style={{ width: 12, height: 35, background: '#64748b', borderRadius: '2px 2px 0 0' }} />
          <div style={{ width: 22, height: 50, background: '#475569', borderRadius: '2px 2px 0 0' }} />
        </div>
        {/* Window grid line */}
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: '#4a3728' }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: '#4a3728' }} />
      </div>

      {/* 🌿 Window Plants */}
      <div style={{ position: 'absolute', left: '3%', top: '30%', fontSize: 22, zIndex: 12, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>🪴</div>
      <div style={{ position: 'absolute', left: '25%', top: '30%', fontSize: 22, zIndex: 12, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>🌿</div>

      {/* ── EAT SLEEP CODE REPEAT Neon Sign (Center Back Wall) ── */}
      <div style={{
        position: 'absolute', left: '46%', top: '3%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', gap: 1, zIndex: 4,
        background: 'rgba(15,23,42,0.65)', padding: '6px 12px', borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {[
          { text: 'EAT', color: '#f87171' },
          { text: 'SLEEP', color: '#60a5fa' },
          { text: 'CODE', color: '#4ade80' },
          { text: 'REPEAT', color: '#fbbf24' }
        ].map(w => (
          <div key={w.text} style={{
            fontSize: 7, fontWeight: 900, fontFamily: 'monospace', letterSpacing: 2,
            color: w.color, textShadow: `0 0 6px ${w.color}`
          }}>{w.text}</div>
        ))}
      </div>

      {/* ── Whiteboard "GAME PLAN" (Right Wall) ── */}
      <div style={{
        position: 'absolute', right: '4%', top: '4%',
        width: '18%', height: '32%',
        background: '#f8fafc',
        border: '4px solid #854d0e',
        borderRadius: 4,
        boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
        zIndex: 5,
        padding: '6px 8px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        <div style={{ fontSize: 7, fontWeight: 900, color: '#0f172a', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 2, marginBottom: 4, letterSpacing: 1 }}>GAME PLAN</div>
        {[
          { t: '• STORY & RAG', done: true },
          { t: '• GAMEPLAY LOGIC', done: true },
          { t: '• 22 AGENTS BIND', done: true },
          { t: '• POLISH & SHIFT', done: false }
        ].map((item, idx) => (
          <div key={idx} style={{
            fontSize: 5.5, fontWeight: 700,
            color: item.done ? '#64748b' : '#0f172a',
            textDecoration: item.done ? 'line-through' : 'none',
            marginBottom: 2
          }}>{item.t}</div>
        ))}
      </div>

      {/* 📚 Bookshelves (Back wall decoration) */}
      <div style={{
        position: 'absolute', right: '24%', top: '4%',
        width: '18%', height: '24%',
        background: '#3e2723', border: '2px solid #2d1a0c',
        borderRadius: 4, zIndex: 3, display: 'flex', gap: 4, padding: 3,
      }}>
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{
            width: 4, height: 12 + (i % 4) * 3,
            background: (['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa'])[i % 5],
            borderRadius: 1, opacity: 0.8,
          }} />
        ))}
      </div>

      {/* ── Warm Room Shadow / Vignette Overlay ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%)',
        pointerEvents: 'none',
        zIndex: 100,
      }} />

      {/* ── Floor Wood Planks grid line ── */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: '36%', height: 2,
        background: '#1c0f0a', zIndex: 10,
      }} />

      {/* ── Water Cooler (Bottom-Left) ── */}
      <div style={{
        position: 'absolute', left: '6%', bottom: '16%',
        zIndex: 88, display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Plastic bottle */}
        <div style={{ width: 14, height: 18, background: 'rgba(56,189,248,0.6)', borderRadius: '8px 8px 0 0', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
        {/* Dispenser base */}
        <div style={{ width: 18, height: 16, background: '#f1f5f9', border: '1.5px solid #cbd5e1', borderRadius: '2px 2px 4px 4px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 5, top: 4, width: 2, height: 3, background: '#ef4444' }} />
          <div style={{ position: 'absolute', right: 5, top: 4, width: 2, height: 3, background: '#3b82f6' }} />
        </div>
      </div>

      {/* ── Cozy Lofi Lounge & TV (Bottom-Right) ── */}
      <div style={{
        position: 'absolute', right: '4%', bottom: '8%',
        width: '26%', height: '30%',
        background: 'rgba(255,255,255,0.03)',
        border: '1.5px dashed rgba(255,255,255,0.1)',
        borderRadius: 8, zIndex: 65,
        display: 'flex', gap: 6, padding: 6,
        alignItems: 'center', justifyContent: 'space-around',
      }}>
        {/* Red Cozy Sofa */}
        <div style={{
          width: '45%', height: '75%',
          background: 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
          border: '2.5px solid #7f1d1d', borderRadius: 6,
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }}>
          {/* Cushions */}
          <div style={{ height: '35%', background: '#b91c1c', borderRadius: 4, margin: 2 }} />
        </div>
        
        {/* TV Console playing a pixel game */}
        <div style={{
          width: '45%', height: '80%',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          {/* Screen */}
          <div style={{
            width: '100%', height: '65%',
            background: '#020617', border: '3px solid #1e293b',
            borderRadius: 4, position: 'relative',
            boxShadow: '0 0 10px rgba(56,189,248,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Retro Game screen indicator */}
            <div style={{ width: '85%', height: '80%', background: '#0369a1', position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 4, top: 4, fontSize: 6, animation: 'sprite-bob 0.5s infinite alternate' }}>👾</div>
            </div>
          </div>
          {/* Console Wood Stand */}
          <div style={{ width: '110%', height: '20%', background: '#78350f', border: '1.5px solid #451a03', borderRadius: 2 }} />
        </div>
      </div>


      {/* ── Characters (Drawn & Walked) ── */}
      {Object.values(agents).map(a => (
        <div
          key={a.id}
          onClick={() => onClickAgent(a.id)}
          style={{
            position: 'absolute',
            left: `${a.pos.x}%`,
            top:  `${a.pos.y}%`,
            transform: 'translate(-50%, -100%)',
            zIndex: Math.round(a.pos.y) + 5,
            cursor: 'pointer',
          }}
        >
          <div style={{ position: 'relative' }}>
            {/* Speech bubble */}
            <AnimatePresence>
              {speeches[a.id] && <Bubble key={speeches[a.id].slice(0, 15)} text={speeches[a.id]} />}
            </AnimatePresence>

            {/* Working Fire Effect */}
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

            {/* Character Name tag */}
            <div style={{
              textAlign: 'center', fontSize: 7, fontWeight: 800, marginTop: 1,
              color: a.isWorking ? '#fb8500' : '#ffffff',
              textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.5)',
              lineHeight: 1,
            }}>{a.id}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
