'use client'

/**
 * OfficeWalker — ระบบให้ตัวละครเดินในห้องได้
 *
 * แต่ละตัวละครมี:
 * - homePos: ตำแหน่งโต๊ะทำงาน (จะกลับมาเมื่อทำงาน)
 * - wanderPos: ตำแหน่งที่เดินไปได้เวลา idle
 * - state: idle | walk | sit
 * - direction: down | left | right | up
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SpriteCharacter, { type Direction, type WalkState } from './SpriteCharacter'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentTask {
  assigned_to: string
  status: 'pending' | 'in_progress' | 'done' | 'failed'
  task_detail: string
}

interface Pos { x: number; y: number }   // % of container

interface AgentState {
  id:        string
  pos:       Pos
  homePos:   Pos
  dir:       Direction
  walkState: WalkState
  isWorking: boolean
}

// ─── Starting positions (% of office room) ───────────────────────────────────

const HOME_POS: Record<string, Pos> = {
  Janie:  { x: 17, y: 24 },
  Metha:  { x: 27, y: 24 },
  Joe:    { x: 40, y: 22 },
  Enjoy:   { x: 50, y: 22 },
  Fenton: { x: 63, y: 24 },
  Karn:   { x: 73, y: 24 },
  Kitti:  { x: 20, y: 57 },
  Nara:   { x: 30, y: 57 },
  Pim:    { x: 46, y: 55 },
  Win:    { x: 56, y: 55 },
  Nam:    { x: 72, y: 57 },
  Kom:    { x: 82, y: 57 },
  Raps:   { x: 88, y: 50 },
}

// Random walk targets (break room, water cooler, etc.)
const WANDER_SPOTS: Pos[] = [
  { x: 4,  y: 62 },  // water cooler
  { x: 50, y: 40 },  // middle of room
  { x: 30, y: 68 },  // coffee area
  { x: 70, y: 65 },  // printer
  { x: 85, y: 68 },  // side desk
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDirection(from: Pos, to: Pos): Direction {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

function posEq(a: Pos, b: Pos) {
  return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1
}

// ─── SpeechBubble ────────────────────────────────────────────────────────────

function SpeechBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -4 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 6,
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      <div style={{
        background: '#fff',
        color: '#1a1a2e',
        fontSize: 9,
        fontWeight: 600,
        padding: '5px 9px',
        borderRadius: 10,
        maxWidth: 130,
        textAlign: 'center',
        lineHeight: 1.35,
        boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        fontFamily: 'system-ui, sans-serif',
      }}>
        {text.length > 38 ? text.slice(0, 38) + '…' : text}
        <div style={{
          position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '5px solid #fff',
        }} />
      </div>
    </motion.div>
  )
}

// ─── Main OfficeWalker Component ──────────────────────────────────────────────

interface OfficeWalkerProps {
  agentIds:  string[]
  tasks:     AgentTask[]
  speeches:  Record<string, string>
  onClickAgent: (id: string) => void
  spriteScale?: number   // 1 = 64px native, 0.75 = 48px, etc.
}

export default function OfficeWalker({
  agentIds, tasks, speeches, onClickAgent, spriteScale = 0.85,
}: OfficeWalkerProps) {
  const [agents, setAgents] = useState<Record<string, AgentState>>(() => {
    const init: Record<string, AgentState> = {}
    agentIds.forEach(id => {
      const home = HOME_POS[id] ?? { x: 50, y: 50 }
      init[id] = {
        id, pos: { ...home }, homePos: home,
        dir: 'down', walkState: 'sit', isWorking: false,
      }
    })
    return init
  })

  // Update isWorking from tasks
  useEffect(() => {
    setAgents(prev => {
      const next = { ...prev }
      agentIds.forEach(id => {
        const task = tasks.find(t => t.assigned_to === id)
        const working = task?.status === 'in_progress'
        if (next[id]) {
          next[id] = { ...next[id], isWorking: working }
          // If just started working, go home
          if (working && !posEq(next[id].pos, next[id].homePos)) {
            next[id].walkState = 'walk'
          }
        }
      })
      return next
    })
  }, [tasks, agentIds])

  // Wander tick — every 4–8s pick a random idle agent to wander
  useEffect(() => {
    const tick = () => {
      setAgents(prev => {
        const idle = Object.values(prev).filter(
          a => !a.isWorking && a.walkState === 'sit' && Math.random() < 0.3
        )
        if (idle.length === 0) return prev

        const agent = idle[Math.floor(Math.random() * idle.length)]
        const target = WANDER_SPOTS[Math.floor(Math.random() * WANDER_SPOTS.length)]
        const dir = getDirection(agent.pos, target)

        return {
          ...prev,
          [agent.id]: { ...agent, walkState: 'walk', dir, _target: target } as AgentState & { _target: Pos },
        }
      })
    }

    const iv = setInterval(tick, 4500 + Math.random() * 3500)
    return () => clearInterval(iv)
  }, [])

  // Movement tick — move walking agents toward their target
  useEffect(() => {
    const mv = setInterval(() => {
      setAgents(prev => {
        const next = { ...prev }
        let changed = false

        Object.values(next).forEach(a => {
          const target: Pos | undefined = (a as AgentState & { _target?: Pos })._target
          if (a.walkState !== 'walk' || !target) return

          const dx = target.x - a.pos.x
          const dy = target.y - a.pos.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 1.2) {
            // Arrived — decide next action
            const isHome = posEq(target, a.homePos)
            next[a.id] = {
              ...a,
              pos: { ...target },
              walkState: 'sit',
              dir: 'down',
              _target: undefined,
            } as AgentState & { _target: undefined }

            // If not at home and idle, return home after 3–6 seconds
            if (!isHome && !a.isWorking) {
              setTimeout(() => {
                setAgents(p => {
                  const curr = p[a.id]
                  if (!curr || curr.walkState !== 'sit') return p
                  const homeDir = getDirection(curr.pos, curr.homePos)
                  return {
                    ...p,
                    [a.id]: { ...curr, walkState: 'walk', dir: homeDir, _target: curr.homePos } as AgentState & { _target: Pos },
                  }
                })
              }, 3000 + Math.random() * 3000)
            }
            changed = true
          } else {
            // Move step
            const speed = 0.8
            const nx = a.pos.x + (dx / dist) * speed
            const ny = a.pos.y + (dy / dist) * speed
            const dir = getDirection(a.pos, target)
            next[a.id] = { ...a, pos: { x: nx, y: ny }, dir }
            changed = true
          }
        })

        return changed ? next : prev
      })
    }, 80)  // ~12fps movement

    return () => clearInterval(mv)
  }, [])

  const frameW = Math.round(64 * spriteScale)
  const frameH = Math.round(64 * spriteScale)

  return (
    <>
      {Object.values(agents).map(a => (
        <div
          key={a.id}
          onClick={() => onClickAgent(a.id)}
          style={{
            position: 'absolute',
            left: `${a.pos.x}%`,
            top: `${a.pos.y}%`,
            transform: 'translate(-50%, -100%)',
            zIndex: 20,
            cursor: 'pointer',
            transition: a.walkState === 'sit' ? 'none' : undefined,
          }}
        >
          {/* Speech bubble */}
          <div style={{ position: 'relative' }}>
            <AnimatePresence>
              {speeches[a.id] && (
                <SpeechBubble key={speeches[a.id].slice(0, 20)} text={speeches[a.id]} />
              )}
            </AnimatePresence>

            {/* Working indicator */}
            {a.isWorking && (
              <div style={{
                position: 'absolute',
                top: -8, right: -6,
                fontSize: 10,
                animation: 'sprite-bob 0.5s ease-in-out infinite alternate',
                zIndex: 5,
              }}>🔥</div>
            )}

            {/* The sprite */}
            <SpriteCharacter
              id={a.id}
              direction={a.dir}
              state={a.walkState}
              scale={spriteScale}
              isWorking={a.isWorking}
            />

            {/* Name label */}
            <div style={{
              textAlign: 'center',
              fontSize: 8,
              fontWeight: 700,
              color: a.isWorking ? '#22c55e' : 'rgba(255,255,255,0.5)',
              marginTop: 1,
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              lineHeight: 1,
            }}>{a.id}</div>
          </div>
        </div>
      ))}
    </>
  )
}
