'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import OfficeMap from './OfficeMap'
import Notifications from '@/app/components/Notifications'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgentTask {
  id: string
  task_detail: string
  assigned_to: string
  status: 'pending' | 'in_progress' | 'done' | 'failed'
  created_at: string
}
interface AgentLog {
  id: string
  agent_name: string
  action_desc: string
  status: 'completed' | 'running' | 'failed'
  created_at: string
}

// ─── Agent data ───────────────────────────────────────────────────────────────

const AGENTS = [
  { id: 'Janie',  th: 'คุณเจนี่',  role: 'AI Orchestrator' },
  { id: 'Joe',    th: 'คุณโจ',     role: 'Backend Architect' },
  { id: 'Enjoy',  th: 'คุณเอนจอย', role: 'Frontend Engineer' },
  { id: 'Fenton', th: 'คุณเฟนตัน', role: 'Quality Officer' },
  { id: 'Karn',   th: 'คุณกานต์',  role: 'Marketing Lead' },
  { id: 'Kitti',  th: 'คุณกิตติ',  role: 'Legal & Compliance' },
  { id: 'Nara',   th: 'คุณนารา',   role: 'Creative Director' },
  { id: 'Metha',  th: 'คุณเมธา',   role: 'CFO' },
  { id: 'Pim',    th: 'คุณพิม',    role: 'Head of Accounting' },
  { id: 'Win',    th: 'คุณวิน',    role: 'Biz Development' },
  { id: 'Nam',    th: 'คุณน้ำ',    role: 'Customer Support' },
  { id: 'Kom',    th: 'คุณคมน์',   role: 'Risk Officer' },
  { id: 'Raps',   th: 'แรปส์',    role: 'HR & Knowledge' },
  { id: 'Ferin',    th: 'คุณเฟริน',   role: 'Chief Procurement' },
  { id: 'Exploiter', th: 'Exploiter', role: 'IT Shortcut Agent' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AgentStatus = 'working' | 'thinking' | 'idle'

function getStatus(id: string, tasks: AgentTask[]): AgentStatus {
  const t = tasks.find(t => t.assigned_to === id)
  if (!t) return 'idle'
  if (t.status === 'in_progress') return 'working'
  if (t.status === 'pending') return 'thinking'
  return 'idle'
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

// ─── Speech Bubble ────────────────────────────────────────────────────────────

function SpeechBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -4 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className="absolute pointer-events-none z-30"
      style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 }}
    >
      <div style={{
        background: '#fff',
        color: '#1a1a2e',
        fontSize: 10,
        fontWeight: 600,
        padding: '5px 10px',
        borderRadius: 12,
        maxWidth: 140,
        textAlign: 'center',
        lineHeight: 1.4,
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        {text.length > 40 ? text.slice(0, 40) + '…' : text}
        <div style={{
          position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid #fff',
        }} />
      </div>
    </motion.div>
  )
}

// ─── Character sprite ─────────────────────────────────────────────────────────

function CharSprite({ id, status, speech, size = 64, onClick }: {
  id: string; status: AgentStatus; speech?: string
  size?: number; onClick?: () => void
}) {
  const isWorking = status === 'working'
  const isThinking = status === 'thinking'
  return (
    <div className="relative flex flex-col items-center cursor-pointer select-none"
      style={{ width: size + 8, animation: status === 'idle' ? 'float-idle 4s ease-in-out infinite' : undefined }}
      onClick={onClick}>
      <AnimatePresence>
        {speech && <SpeechBubble key={speech.slice(0, 20)} text={speech} />}
      </AnimatePresence>
      <div style={{
        width: size, height: size,
        borderRadius: 8,
        overflow: 'hidden',
        border: isWorking ? '2px solid #22c55e' : isThinking ? '2px solid #eab308' : '2px solid rgba(255,255,255,0.1)',
        boxShadow: isWorking ? '0 0 14px #22c55e66' : isThinking ? '0 0 10px #eab30866' : 'none',
        transition: 'all 0.3s',
        imageRendering: 'pixelated',
      }}>
        <Image src={`/characters/${id.toLowerCase()}.png`} alt={id}
          width={size} height={size} className="w-full h-full object-cover object-top"
          style={{ imageRendering: 'pixelated' }} />
        {isWorking && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(transparent 60%, rgba(34,197,94,0.15))',
          }} />
        )}
      </div>
      {isWorking && (
        <div style={{
          position: 'absolute', top: 2, right: 2,
          fontSize: 11, animation: 'float-idle 0.5s ease-in-out infinite alternate',
        }}>🔥</div>
      )}
    </div>
  )
}

// ─── Office Room ─────────────────────────────────────────────────────────────

const ALL_AGENT_IDS = AGENTS.map(a => a.id)

function OfficeRoom({ tasks, speeches, onClickAgent }: {
  tasks: AgentTask[]
  speeches: Record<string, string>
  onClickAgent: (id: string) => void
}) {
  return (
    <div className="relative w-full h-full overflow-hidden select-none"
      style={{ background: '#1a1008' }}>

      {/* ── BACK WALL ── */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #0f1a2e 0%, #0a1020 38%, #1a1008 38%)',
      }} />

      {/* Windows */}
      {[8, 26, 44, 62, 80].map((left, i) => (
        <div key={i} className="absolute" style={{
          left: `${left}%`, top: '3%', width: '14%', height: '28%',
          background: 'linear-gradient(180deg,#1e3a5f 0%,#0d2040 50%,#091428 100%)',
          border: '2px solid #243b55', borderRadius: 2,
          boxShadow: 'inset 0 0 20px rgba(30,80,160,0.3)',
        }}>
          <div style={{ position:'absolute', top:'50%', left:0, right:0, height:1, background:'#243b55' }} />
          <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:1, background:'#243b55' }} />
          {[20,40,60,80].map(x => (
            <div key={x} style={{
              position:'absolute', bottom:`${10+(x%20)}%`,
              left:`${x}%`, width:2, height:4+(i%3)*2,
              background:(['#f59e0b','#60a5fa','#f87171','#34d399'] as string[])[x/20|0]+'99',
            }} />
          ))}
        </div>
      ))}

      {/* Neon sign */}
      <div className="absolute" style={{ left:'50%', top:'3%', transform:'translateX(-50%)', textAlign:'center' }}>
        {(['EAT','SLEEP','CODE','REPEAT'] as string[]).map((w, i) => (
          <div key={w} style={{
            fontSize:12, letterSpacing:4, fontWeight:900, fontFamily:'monospace',
            color:(['#ff6b6b','#4ecdc4','#45b7d1','#f9ca24'] as string[])[i],
            textShadow:`0 0 8px ${(['#ff6b6b','#4ecdc4','#45b7d1','#f9ca24'] as string[])[i]}`,
          }}>{w}</div>
        ))}
      </div>

      {/* Company sign */}
      <div className="absolute" style={{ right:'6%', top:'3%' }}>
        <div style={{ background:'#0d1b2a',border:'2px solid #1e3a5f',padding:'8px 14px',borderRadius:4,textAlign:'center' }}>
          <div style={{ fontSize:9,fontWeight:900,letterSpacing:3,color:'#60a5fa' }}>B3 TEAM</div>
          <div style={{ fontSize:13,fontWeight:900,color:'#fff',letterSpacing:2 }}>AVENGER</div>
          <div style={{ fontSize:7,color:'#4b5563',letterSpacing:2 }}>9CJ CORP</div>
        </div>
      </div>

      {/* Bookshelf */}
      <div className="absolute" style={{ right:0, top:'3%', width:'5%', height:'35%', background:'#2d1b0e', borderLeft:'2px solid #3d2510' }}>
        {[0,1,2,3,4,5,6,7,8].map(i => (
          <div key={i} style={{ margin:'2px 3px', height:8+(i%3)*2, borderRadius:1, opacity:0.85,
            background:(['#7c3aed','#1d4ed8','#065f46','#92400e','#c2410c','#334155','#7c3aed','#1d4ed8','#065f46'] as string[])[i] }} />
        ))}
      </div>

      {/* Whiteboard */}
      <div className="absolute" style={{ left:'1%', top:'5%', width:'6%', height:'28%', background:'#f0ede8', border:'3px solid #8B4513', borderRadius:3 }}>
        <div style={{ background:'#8B4513', height:4 }} />
        <div style={{ padding:'4px 3px' }}>
          <div style={{ fontSize:5,fontWeight:900,color:'#1a1a2e',marginBottom:2 }}>B3 PLAN</div>
          {['— BUILD','— DESIGN','— SHIP','— WIN'].map(t => (
            <div key={t} style={{ fontSize:4,color:'#374151' }}>{t}</div>
          ))}
        </div>
      </div>

      {/* Plants */}
      {([{l:'7%',t:'32%'},{l:'88%',t:'30%'}]).map((p,i) => (
        <div key={i} className="absolute" style={{ left:p.l, top:p.t, fontSize:28, filter:'saturate(0.7) brightness(0.75)' }}>🪴</div>
      ))}

      {/* Floor */}
      <div className="absolute" style={{ left:0, right:0, bottom:0, height:'44%', background:'linear-gradient(180deg,#2a1a0a 0%,#1a0e04 100%)' }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ position:'absolute', left:0, right:0, top:`${18+i*17}%`, height:1, background:'rgba(90,55,15,0.35)' }} />
        ))}
      </div>

      {/* Desks (static decoration, characters are overlaid by OfficeWalker) */}
      {[
        { x:18, y:26, w:110, scale:0.82 }, { x:40, y:24, w:110, scale:0.82 }, { x:62, y:26, w:110, scale:0.82 },
        { x:18, y:60, w:120, scale:1 },    { x:44, y:58, w:120, scale:1 },    { x:70, y:60, w:120, scale:1 },
      ].map((d, i) => (
        <div key={i} className="absolute" style={{ left:`${d.x}%`, top:`${d.y}%`, transform:`scale(${d.scale})`, transformOrigin:'bottom center', zIndex:5 }}>
          <div style={{ width:d.w, height:8, background:'linear-gradient(180deg,#6b4a20,#4a3010)', borderRadius:'2px 2px 0 0', border:'1px solid #8B6030' }} />
          <div style={{ position:'absolute', top:-16, left:'50%', transform:'translateX(-50%)', width:28, height:18, background:'#0d1b2a', border:'2px solid #1e3a5f', borderRadius:2, boxShadow:'0 0 5px rgba(30,100,200,0.4)' }}>
            <div style={{ padding:2 }}>
              {[0,1,2].map(l => <div key={l} style={{ height:2, marginBottom:1, background:l===0?'#4ade80':l===1?'#60a5fa':'#94a3b8', opacity:0.7, borderRadius:1, width:l===2?'60%':'100%' }} />)}
            </div>
          </div>
          <div style={{ position:'absolute', top:-14, right:-10, fontSize:10 }}>☕</div>
        </div>
      ))}

      {/* Water cooler */}
      <div className="absolute" style={{ left:'2%', bottom:'28%', fontSize:30, filter:'brightness(0.7)' }}>🫙</div>
      <div className="absolute" style={{ right:'5%', bottom:'26%', fontSize:16, opacity:0.35, animation:'float-idle 3s ease-in-out infinite' }}>🎵</div>

      {/* Characters rendered by OfficeMap in center panel */}
    </div>
  )
}

// ─── Left Panel ───────────────────────────────────────────────────────────────

function LeftPanel({ tasks, selectedAgent, onSelectAgent }: {
  tasks: AgentTask[]
  selectedAgent: string | null
  onSelectAgent: (id: string | null) => void
}) {
  const done    = tasks.filter(t => t.status === 'done').length
  const total   = tasks.length || 1
  const pct     = Math.round((done / total) * 100)
  const active  = tasks.filter(t => t.status === 'in_progress')
  const pending = tasks.filter(t => t.status === 'pending')

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden" style={{ width: 220 }}>

      {/* PROJECT card */}
      <div className="panel shrink-0">
        <div className="panel-header">
          <span>PROJECT</span>
          <div className="flex gap-1">
            <span style={{ cursor:'pointer', color:'#4b5563' }}>⊟</span>
            <span style={{ cursor:'pointer', color:'#4b5563' }}>✕</span>
          </div>
        </div>
        <div style={{ padding:'10px 12px' }}>
          {/* thumbnail */}
          <div style={{
            background:'linear-gradient(135deg,#1e3a5f,#7c3aed)',
            height:64, borderRadius:6, marginBottom:8,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:28,
          }}>🏢</div>
          <div style={{ fontSize:8, color:'#4b5563', fontWeight:700, letterSpacing:2 }}>9CJ CORP</div>
          <div style={{ fontSize:15, fontWeight:900, color:'#f0f6fc', marginBottom:8 }}>B3 AVENGER</div>
          {/* progress */}
          <div style={{ height:6, background:'#21262d', borderRadius:3, marginBottom:4, overflow:'hidden' }}>
            <div style={{
              height:'100%', width:`${pct}%`,
              background:'linear-gradient(90deg,#22c55e,#4ade80)',
              borderRadius:3, transition:'width 0.6s',
              animation:'progress-glow 2s ease-in-out infinite',
            }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#4b5563' }}>
            <span style={{ color:'#22c55e', fontWeight:700 }}>{pct}%</span>
            <span>In Development</span>
          </div>
        </div>
      </div>

      {/* TASKS */}
      <div className="panel flex-1 flex flex-col overflow-hidden">
        <div className="panel-header">
          <span>TASKS</span>
          <span style={{ cursor:'pointer', color:'#22c55e', fontSize:14, fontWeight:700 }}>+</span>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'4px 0' }}>
          {[...active, ...pending].slice(0, 8).map(t => {
            const prog = t.status === 'in_progress' ? 65 : 30
            return (
              <div key={t.id} style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'6px 10px',
                borderBottom:'1px solid #21262d',
                cursor:'pointer',
              }}>
                {/* avatar */}
                <div style={{ width:22, height:22, borderRadius:4, overflow:'hidden', flexShrink:0 }}>
                  <Image src={`/characters/${t.assigned_to.toLowerCase()}.png`} alt={t.assigned_to}
                    width={22} height={22} className="w-full h-full object-cover" />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#f0f6fc',
                    overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                    {t.task_detail.slice(0, 22)}{t.task_detail.length > 22 ? '…' : ''}
                  </div>
                  <div style={{ fontSize:8, color:'#4b5563' }}>{t.assigned_to}</div>
                  {t.status === 'in_progress' && (
                    <div style={{ height:2, background:'#21262d', borderRadius:1, marginTop:2 }}>
                      <div style={{ height:'100%', width:`${prog}%`, background:'#22c55e', borderRadius:1 }} />
                    </div>
                  )}
                </div>
                <div>
                  {t.status === 'done'
                    ? <span style={{ color:'#22c55e', fontSize:12 }}>✓</span>
                    : t.status === 'in_progress'
                    ? <span style={{ fontSize:8, color:'#eab308', fontWeight:700 }}>{prog}%</span>
                    : null
                  }
                </div>
              </div>
            )
          })}
          {tasks.length === 0 && (
            <div style={{ padding:'16px 10px', fontSize:10, color:'#4b5563', textAlign:'center' }}>
              ยังไม่มี Task
            </div>
          )}
        </div>
      </div>

      {/* AI AGENTS */}
      <div className="panel shrink-0" style={{ maxHeight: 240, display:'flex', flexDirection:'column' }}>
        <div className="panel-header">
          <span>AI AGENTS ({AGENTS.length})</span>
          <span style={{ fontSize:9, color:'#22c55e' }}>
            {AGENTS.filter(a => getStatus(a.id, tasks) !== 'idle').length > 0
              ? `${AGENTS.filter(a => getStatus(a.id, tasks) !== 'idle').length} active`
              : 'all idle'}
          </span>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>
          {AGENTS.map(a => {
            const st = getStatus(a.id, tasks)
            return (
              <div key={a.id} onClick={() => onSelectAgent(selectedAgent === a.id ? null : a.id)}
                style={{
                  display:'flex', alignItems:'center', gap:7,
                  padding:'5px 10px', cursor:'pointer',
                  background: selectedAgent === a.id ? '#1c2128' : 'transparent',
                  borderBottom:'1px solid #21262d',
                }}>
                <div style={{ width:20, height:20, borderRadius:4, overflow:'hidden' }}>
                  <Image src={`/characters/${a.id.toLowerCase()}.png`} alt={a.id}
                    width={20} height={20} className="w-full h-full object-cover" />
                </div>
                <span style={{ flex:1, fontSize:10, fontWeight:600, color:'#f0f6fc' }}>{a.id}</span>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div className={`w-2 h-2 rounded-full ${st==='working'?'led-green':st==='thinking'?'led-yellow':'led-gray'}`} />
                  <span style={{ fontSize:8, color: st==='working'?'#22c55e':st==='thinking'?'#eab308':'#4b5563' }}>
                    {st==='working'?'Working...':st==='thinking'?'Thinking...':'Idle'}
                  </span>
                  <span style={{ fontSize:8, color:'#30363d' }}>›</span>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{
          margin:'6px 8px', padding:'5px',
          background:'#0d1117', border:'1px solid #22c55e33',
          borderRadius:6, textAlign:'center', cursor:'pointer',
          fontSize:9, fontWeight:700, color:'#22c55e',
        }}>
          + NEW AGENT
        </div>
      </div>
    </div>
  )
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

function RightPanel({ tasks }: { tasks: AgentTask[] }) {
  const done    = tasks.filter(t => t.status === 'done').length
  const total   = tasks.length || 1
  const pct     = Math.round((done / total) * 100)
  const morale  = Math.min(100, 70 + done * 3)

  return (
    <div style={{ width: 200 }}>
      <div className="panel">
        <div className="panel-header">
          <span>COMPANY STATUS</span>
          <div className="flex gap-1">
            <span style={{ cursor:'pointer', color:'#4b5563' }}>⊟</span>
            <span style={{ cursor:'pointer', color:'#4b5563' }}>⊠</span>
            <span style={{ cursor:'pointer', color:'#4b5563' }}>✕</span>
          </div>
        </div>
        <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:10 }}>

          {/* Team Morale */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <span style={{ fontSize:12 }}>😊</span>
              <span style={{ fontSize:9, fontWeight:700, color:'#8b949e' }}>TEAM MORALE</span>
              <span style={{ fontSize:9, fontWeight:900, color:'#22c55e', marginLeft:'auto' }}>{morale}%</span>
            </div>
            <div style={{ height:5, background:'#21262d', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${morale}%`, background:'#22c55e', borderRadius:3, transition:'width 0.6s' }} />
            </div>
          </div>

          {/* Project Progress */}
          <div>
            <div style={{ display:'flex', alignItems:'center', marginBottom:4 }}>
              <span style={{ fontSize:9, fontWeight:700, color:'#8b949e', flex:1 }}>PROJECT PROGRESS</span>
              <span style={{ fontSize:9, fontWeight:900, color:'#60a5fa' }}>{pct}%</span>
            </div>
            <div style={{ height:5, background:'#21262d', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:'#60a5fa', borderRadius:3, transition:'width 0.6s' }} />
            </div>
          </div>

          {/* Burn Down */}
          <div>
            <div style={{ display:'flex', alignItems:'center', marginBottom:4 }}>
              <span style={{ fontSize:9, fontWeight:700, color:'#8b949e', flex:1 }}>BURN DOWN</span>
              <span style={{ fontSize:9, color:'#8b949e' }}>
                {tasks.filter(t=>t.status==='pending').length} tasks left
              </span>
            </div>
            <div style={{ height:5, background:'#21262d', borderRadius:3, overflow:'hidden' }}>
              <div style={{
                height:'100%',
                width:`${100 - pct}%`,
                background:'linear-gradient(90deg,#a855f7,#7c3aed)',
                borderRadius:3, transition:'width 0.6s',
              }} />
            </div>
          </div>

          <div style={{ borderTop:'1px solid #21262d', paddingTop:8 }}>
            {[
              { label:'Tasks Done', val:`${done}/${total}`, color:'#22c55e' },
              { label:'Active Now', val:`${tasks.filter(t=>t.status==='in_progress').length}`, color:'#60a5fa' },
              { label:'AI Agents', val:`${AGENTS.length}`, color:'#a855f7' },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:9, color:'#4b5563' }}>{r.label}</span>
                <span style={{ fontSize:9, fontWeight:700, color:r.color }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Bottom: Console + Chat ────────────────────────────────────────────────────

function BottomPanels({ logs, selectedAgent, tasks }: {
  logs: AgentLog[]
  selectedAgent: string | null
  tasks: AgentTask[]
}) {
  const [msg, setMsg]       = useState('')
  const [sending, setSending] = useState(false)
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'agent'; text: string; who: string }[]>([])
  const chatRef = useRef<HTMLDivElement>(null)
  const consRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight) }, [chatLog])
  useEffect(() => { consRef.current?.scrollTo(0, consRef.current.scrollHeight) }, [logs])

  const sendMsg = async () => {
    if (!msg.trim() || !selectedAgent || sending) return
    const text = msg.trim(); setMsg(''); setSending(true)
    setChatLog(p => [...p, { role: 'user', text, who: 'You' }])
    try {
      const res = await fetch('/api/agent-bridge/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ agent_id: selectedAgent, message: text }),
      })
      const d = await res.json()
      if (res.ok) setChatLog(p => [...p, { role:'agent', text: d.reply, who: selectedAgent }])
    } catch { /* silent */ }
    finally { setSending(false) }
  }

  const target = selectedAgent || 'Janie'

  return (
    <div className="flex gap-2 shrink-0" style={{ height: 170 }}>

      {/* SYSTEM CONSOLE */}
      <div className="panel flex-1 flex flex-col overflow-hidden">
        <div className="panel-header">
          <span>SYSTEM CONSOLE</span>
          <span style={{ cursor:'pointer', color:'#4b5563' }}>✕</span>
        </div>
        <div ref={consRef} style={{
          flex:1, overflowY:'auto', padding:'4px 10px',
          fontFamily:'monospace', fontSize:10, lineHeight:1.7,
        }}>
          {logs.length === 0 && <span style={{ color:'#4b5563' }}>//  waiting for activity...</span>}
          {[...logs].reverse().slice(0, 30).map((l, i) => (
            <div key={l.id ?? i} style={{ display:'flex', gap:8 }}>
              <span style={{ color:'#4b5563', flexShrink:0 }}>[{fmt(l.created_at)}]</span>
              <span style={{ fontWeight:700, color:'#60a5fa', flexShrink:0 }}>{l.agent_name}</span>
              <span style={{ color: l.status==='completed'?'#22c55e':l.status==='running'?'#60a5fa':'#f87171' }}>
                {l.action_desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* TEAM CHAT */}
      <div className="panel flex flex-col overflow-hidden" style={{ width: 300 }}>
        <div className="panel-header">
          <span>TEAM CHAT {selectedAgent ? `→ ${selectedAgent}` : ''}</span>
          <div className="flex gap-1">
            <span style={{ cursor:'pointer', color:'#4b5563' }}>⊟</span>
            <span style={{ cursor:'pointer', color:'#4b5563' }}>⊠</span>
          </div>
        </div>
        <div ref={chatRef} style={{
          flex:1, overflowY:'auto', padding:'6px 10px',
          display:'flex', flexDirection:'column', gap:4,
        }}>
          {chatLog.length === 0 && (
            <div style={{ fontSize:9, color:'#4b5563', textAlign:'center', marginTop:8 }}>
              {selectedAgent ? `คลิกตัวละครหรือพิมพ์เพื่อคุยกับ ${selectedAgent}` : 'คลิกตัวละครเพื่อเริ่มสนทนา'}
            </div>
          )}
          {chatLog.map((c, i) => (
            <div key={i} style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
              <div style={{ width:18, height:18, borderRadius:3, overflow:'hidden', flexShrink:0 }}>
                <Image
                  src={c.role==='user' ? '/characters/janie.png' : `/characters/${c.who.toLowerCase()}.png`}
                  alt={c.who} width={18} height={18} className="w-full h-full object-cover"
                  onError={() => {}}
                />
              </div>
              <div>
                <span style={{ fontSize:9, fontWeight:700, color: c.role==='user'?'#a855f7':'#60a5fa' }}>
                  {c.who}:{' '}
                </span>
                <span style={{ fontSize:9, color:'#8b949e' }}>{c.text}</span>
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ fontSize:9, color:'#4b5563', fontStyle:'italic' }}>
              {target} กำลังตอบ...
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:6, padding:'6px 8px', borderTop:'1px solid #21262d' }}>
          <input value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMsg() }}
            placeholder={`Type a message...`}
            style={{
              flex:1, background:'#0d1117', border:'1px solid #30363d',
              borderRadius:6, padding:'4px 8px', fontSize:10, color:'#f0f6fc',
              outline:'none',
            }}
          />
          <button onClick={sendMsg} disabled={!msg.trim() || sending}
            style={{
              background: '#238636', border:'none', borderRadius:6,
              padding:'4px 10px', color:'#fff', fontSize:10, fontWeight:700,
              cursor:'pointer', opacity: (!msg.trim() || sending) ? 0.4 : 1,
            }}>
            ›
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Approval Banner ──────────────────────────────────────────────────────────

interface AgentApproval {
  id: string
  action_type: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  nam_summary: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

const RISK_COLOR: Record<string, string> = {
  low:      '#22c55e',
  medium:   '#f59e0b',
  high:     '#f87171',
  critical: '#ef4444',
}

function ApprovalBanner({ approvals, onResolve }: {
  approvals: AgentApproval[]
  onResolve: (id: string, action: 'approve' | 'reject') => void
}) {
  if (approvals.length === 0) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        margin: '6px 8px 0',
        borderRadius: 8,
        border: '1px solid rgba(239,68,68,0.4)',
        background: 'rgba(239,68,68,0.06)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px',
        background: 'rgba(239,68,68,0.1)',
        borderBottom: '1px solid rgba(239,68,68,0.2)',
      }}>
        <span style={{ fontSize: 14 }}>⚠️</span>
        <span style={{ fontSize: 10, fontWeight: 900, color: '#f87171', letterSpacing: 1 }}>
          EXPLOITER — รอ APPROVE ({approvals.length})
        </span>
        <span style={{ fontSize: 9, color: '#6b7280', marginLeft: 4 }}>
          คุณน้ำสรุปไว้ให้แล้ว กรุณาอ่านและตัดสินใจ
        </span>
      </div>

      {/* Approval cards */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 12px', overflowX: 'auto' }}>
        {approvals.map(ap => (
          <div key={ap.id} style={{
            flexShrink: 0, width: 300,
            background: '#0d1117',
            border: `1px solid ${RISK_COLOR[ap.risk_level] ?? '#f59e0b'}44`,
            borderRadius: 8, padding: '10px 12px',
          }}>
            {/* Risk badge + type */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{
                fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 20,
                background: `${RISK_COLOR[ap.risk_level] ?? '#f59e0b'}22`,
                border: `1px solid ${RISK_COLOR[ap.risk_level] ?? '#f59e0b'}44`,
                color: RISK_COLOR[ap.risk_level] ?? '#f59e0b',
                textTransform: 'uppercase',
              }}>{ap.risk_level}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#f0f6fc' }}>{ap.action_type}</span>
            </div>

            {/* Nam's summary */}
            <div style={{ fontSize: 10, color: '#8b949e', lineHeight: 1.6, marginBottom: 10 }}>
              {ap.nam_summary}
            </div>

            {/* Approve / Reject buttons */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => onResolve(ap.id, 'approve')}
                style={{
                  flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 700,
                  background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
                  borderRadius: 6, color: '#4ade80', cursor: 'pointer',
                }}>
                ✅ Approve
              </button>
              <button
                onClick={() => onResolve(ap.id, 'reject')}
                style={{
                  flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 700,
                  background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: 6, color: '#f87171', cursor: 'pointer',
                }}>
                ❌ Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Top Nav ──────────────────────────────────────────────────────────────────

function TopNav({ now, tasks }: { now: Date | null; tasks: AgentTask[] }) {
  const navItems = ['DASHBOARD','PROJECTS','AI AGENTS','ASSETS','TEAM','ANALYTICS','SETTINGS']
  const done = tasks.filter(t => t.status === 'done').length
  const total = tasks.length || 1
  const pct = Math.round((done / total) * 100)

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:0,
      background:'#161b22', borderBottom:'1px solid #30363d',
      height:44, paddingLeft:12, paddingRight:16, flexShrink:0,
    }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:20 }}>
        <div style={{
          width:28, height:28, borderRadius:6,
          background:'linear-gradient(135deg,#7c3aed,#2563eb)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:11, fontWeight:900, color:'#fff',
        }}>B3</div>
        <div>
          <div style={{ fontSize:9, fontWeight:900, letterSpacing:2, color:'#f0f6fc', lineHeight:1 }}>TEAM AVENGER</div>
          <div style={{ fontSize:7, color:'#4b5563', letterSpacing:1 }}>9CJ CORP</div>
        </div>
      </div>

      {/* Nav tabs */}
      {navItems.map((item, i) => (
        <div key={item} style={{
          padding:'0 14px', height:'100%',
          display:'flex', alignItems:'center',
          fontSize:10, fontWeight:700, letterSpacing:0.5,
          color: i === 2 ? '#f0f6fc' : '#4b5563',
          background: i === 2 ? '#0d1117' : 'transparent',
          borderBottom: i === 2 ? '2px solid #60a5fa' : '2px solid transparent',
          cursor: i === 2 ? 'default' : 'not-allowed',
          opacity: i === 2 ? 1 : 0.5,
          transition:'all 0.15s',
        }}>{item}</div>
      ))}

      {/* Right side */}
      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
        {/* XP bar */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ fontSize:9, color:'#60a5fa', fontWeight:700 }}>PROGRESS</div>
          <div style={{ width:80, height:4, background:'#21262d', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#60a5fa,#a855f7)', borderRadius:2 }} />
          </div>
          <div style={{ fontSize:9, fontWeight:900, color:'#a855f7' }}>{pct}%</div>
        </div>

        {/* Quick links */}
        <Link href="/room" style={{
          padding:'3px 8px', borderRadius:5, fontSize:9, fontWeight:700,
          background:'rgba(129,140,248,0.12)', border:'1px solid rgba(129,140,248,0.25)',
          color:'#818cf8', textDecoration:'none', letterSpacing:0.5,
        }}>
          🏢 ROOM
        </Link>
        <Link href="/history" style={{
          padding:'3px 8px', borderRadius:5, fontSize:9, fontWeight:700,
          background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)',
          color:'#f59e0b', textDecoration:'none', letterSpacing:0.5,
        }}>
          📋 HISTORY
        </Link>

        {/* clock */}
        <div style={{ fontSize:10, fontFamily:'monospace', color:'#4b5563' }}>
          🕐 {now?.toLocaleTimeString('th-TH') ?? '--:--:--'}
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardClient({
  initialLogs, initialTasks,
}: {
  initialLogs: AgentLog[]
  initialTasks: AgentTask[]
}) {
  const [tasks,     setTasks]     = useState<AgentTask[]>(initialTasks)
  const [logs,      setLogs]      = useState<AgentLog[]>(initialLogs)
  const [now,       setNow]       = useState<Date | null>(null)
  const [sel,       setSel]       = useState<string | null>(null)
  const [speeches,  setSpeeches]  = useState<Record<string, string>>({})
  const [approvals, setApprovals] = useState<AgentApproval[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const supabase = createClient()

  // clock
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // fetch pending approvals on mount
  useEffect(() => {
    fetch('/api/approvals')
      .then(r => r.json())
      .then(d => { if (d.approvals) setApprovals(d.approvals as AgentApproval[]) })
      .catch(() => {/* silent */})
  }, [])

  // realtime: approvals
  useEffect(() => {
    const ch = supabase.channel('dash_approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_approvals' }, p => {
        if (p.eventType === 'INSERT') {
          setApprovals(prev => [p.new as AgentApproval, ...prev])
        }
        if (p.eventType === 'UPDATE') {
          const u = p.new as AgentApproval
          setApprovals(prev => u.status === 'pending'
            ? prev.map(a => a.id === u.id ? u : a)
            : prev.filter(a => a.id !== u.id)
          )
        }
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase])

  const handleResolveApproval = useCallback(async (id: string, action: 'approve' | 'reject') => {
    setApprovals(prev => prev.filter(a => a.id !== id))
    await fetch(`/api/approvals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
  }, [])

  // realtime: tasks
  useEffect(() => {
    const ch = supabase.channel('dash_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_tasks' }, p => {
        if (p.eventType === 'INSERT') setTasks(prev => [p.new as AgentTask, ...prev].slice(0, 50))
        if (p.eventType === 'UPDATE') {
          const u = p.new as AgentTask
          setTasks(prev => prev.map(t => t.id === u.id ? u : t))
        }
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase])

  // realtime: logs + speech bubbles
  useEffect(() => {
    const ch = supabase.channel('dash_msgs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_messages' }, p => {
        const row = p.new as { agent_id?: string; role?: string; content?: string; created_at?: string; id?: string }
        if (row.role !== 'agent' || !row.agent_id || !row.content) return
        const aid = row.agent_id
        setSpeeches(prev => ({ ...prev, [aid]: row.content! }))
        if (timers.current[aid]) clearTimeout(timers.current[aid])
        timers.current[aid] = setTimeout(() =>
          setSpeeches(prev => { const n = { ...prev }; delete n[aid]; return n }), 6000)
        setLogs(prev => [
          { id: row.id ?? String(Date.now()), agent_name: aid,
            action_desc: `"${row.content!.slice(0, 50)}"`,
            status: 'completed' as const, created_at: row.created_at ?? new Date().toISOString() },
          ...prev,
        ].slice(0, 100))
      }).subscribe()
    const ch2 = supabase.channel('dash_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_logs' }, p => {
        setLogs(prev => [p.new as AgentLog, ...prev].slice(0, 100))
      }).subscribe()
    return () => { supabase.removeChannel(ch); supabase.removeChannel(ch2) }
  }, [supabase])

  const handleClickAgent = useCallback((id: string) => {
    setSel(prev => prev === id ? null : id)
  }, [])

  return (
    <div style={{
      display:'flex', flexDirection:'column',
      height:'100dvh', background:'#0d1117', overflow:'hidden',
    }}>
      {/* Top Nav */}
      <TopNav now={now} tasks={tasks} />

      {/* Agent done toast notifications */}
      <Notifications />

      {/* Exploiter Approval Banner */}
      <ApprovalBanner approvals={approvals} onResolve={handleResolveApproval} />

      {/* Body */}
      <div style={{ flex:1, display:'flex', gap:8, padding:'8px', overflow:'hidden' }}>

        {/* LEFT */}
        <LeftPanel tasks={tasks} selectedAgent={sel} onSelectAgent={setSel} />

        {/* CENTER */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8, overflow:'hidden' }}>
          {/* Office room */}
          <div style={{ flex:1, borderRadius:8, overflow:'hidden', border:'1px solid #30363d' }}>
            <OfficeMap
              agentIds={ALL_AGENT_IDS}
              tasks={tasks}
              speeches={speeches}
              onClickAgent={handleClickAgent}
            />
          </div>

          {/* Bottom panels */}
          <BottomPanels logs={logs} selectedAgent={sel} tasks={tasks} />
        </div>

        {/* RIGHT */}
        <RightPanel tasks={tasks} />
      </div>
    </div>
  )
}
