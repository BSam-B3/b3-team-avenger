'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Task {
  id: string; task_detail: string; assigned_to: string
  status: 'pending'|'in_progress'|'done'|'failed'; created_at: string
}

const AGENTS = ['Janie','Joe','Enjoy','Fenton','Karn','Kitti','Nara','Metha','Pim','Win','Nam','Kom','Raps','Ferin','Exploiter']

const COLUMNS: { key: Task['status']; label: string; color: string; icon: string }[] = [
  { key:'pending',     label:'BACKLOG',     color:'#475569', icon:'📋' },
  { key:'in_progress', label:'IN PROGRESS', color:'#f59e0b', icon:'⚡' },
  { key:'done',        label:'DONE',        color:'#22c55e', icon:'✅' },
  { key:'failed',      label:'FAILED',      color:'#f87171', icon:'❌' },
]

export default function ProjectsPage() {
  const [tasks,       setTasks]     = useState<Task[]>([])
  const [filter,      setFilter]    = useState<string>('all')
  const [loading,     setLoading]   = useState(true)
  const [newTask,     setNewTask]   = useState('')
  const [newAgent,    setNewAgent]  = useState('Janie')
  const [adding,      setAdding]    = useState(false)
  const [showNew,     setShowNew]   = useState(false)

  const load = () => {
    fetch('/api/history?limit=100')
      .then(r => r.json())
      .then(d => { setTasks(d.tasks ?? []); setLoading(false) })
  }
  useEffect(load, [])

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.assigned_to === filter)

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = filtered.filter(t => t.status === col.key)
    return acc
  }, {} as Record<Task['status'], Task[]>)

  const submitTask = async () => {
    if (!newTask.trim()) return
    setAdding(true)
    await fetch('/api/agent-bridge/task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: newAgent, task_detail: newTask }),
    })
    setNewTask(''); setShowNew(false)
    setTimeout(load, 1500)
    setAdding(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0d1117', fontFamily:"'Segoe UI', system-ui, sans-serif", color:'#f0f6fc' }}>
      {/* Top bar */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(13,17,23,0.95)', borderBottom:'1px solid #30363d', display:'flex', alignItems:'center', gap:12, padding:'0 20px', height:44 }}>
        <div style={{ width:28, height:28, borderRadius:6, background:'linear-gradient(135deg,#7c3aed,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#fff' }}>B3</div>
        <div style={{ fontSize:9, fontWeight:900, letterSpacing:2, color:'#f0f6fc' }}>TEAM AVENGER</div>
        <div style={{ width:1, height:18, background:'#30363d', margin:'0 4px' }} />
        <span style={{ fontSize:11, fontWeight:700, color:'#818cf8' }}>📁 PROJECTS</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {[{label:'DASHBOARD',href:'/dashboard',color:'#60a5fa'},{label:'ANALYTICS',href:'/analytics',color:'#a855f7'},{label:'TEAM',href:'/team',color:'#34d399'}].map(l => (
            <Link key={l.href} href={l.href} style={{ padding:'3px 10px', borderRadius:5, fontSize:9, fontWeight:700, background:`${l.color}18`, border:`1px solid ${l.color}33`, color:l.color, textDecoration:'none' }}>{l.label}</Link>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 20px' }}>
        {/* Toolbar */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          {/* Agent filter */}
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:6, padding:'5px 10px', color:'#f0f6fc', fontSize:11 }}>
            <option value="all">All Agents</option>
            {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Stats */}
          <div style={{ display:'flex', gap:8 }}>
            {COLUMNS.map(c => (
              <div key={c.key} style={{ fontSize:10, color:'#4b5563' }}>
                <span style={{ color:c.color, fontWeight:700 }}>{grouped[c.key]?.length ?? 0}</span> {c.label.toLowerCase()}
              </div>
            ))}
          </div>

          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <button onClick={load} style={{ padding:'5px 12px', borderRadius:6, fontSize:10, fontWeight:700, background:'rgba(255,255,255,0.05)', border:'1px solid #30363d', color:'#8b949e', cursor:'pointer' }}>
              🔄 Refresh
            </button>
            <button onClick={() => setShowNew(p => !p)} style={{ padding:'5px 12px', borderRadius:6, fontSize:10, fontWeight:700, background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.4)', color:'#4ade80', cursor:'pointer' }}>
              + New Task
            </button>
          </div>
        </div>

        {/* New task form */}
        {showNew && (
          <div style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:10, padding:'14px 16px', marginBottom:16, display:'flex', gap:10, alignItems:'flex-end' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, color:'#4b5563', marginBottom:4 }}>TASK DETAIL</div>
              <input value={newTask} onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitTask()}
                placeholder="อธิบาย task ที่ต้องทำ..."
                style={{ width:'100%', background:'#0d1117', border:'1px solid #30363d', borderRadius:6, padding:'7px 10px', color:'#f0f6fc', fontSize:11, outline:'none' }} />
            </div>
            <div>
              <div style={{ fontSize:9, color:'#4b5563', marginBottom:4 }}>ASSIGN TO</div>
              <select value={newAgent} onChange={e => setNewAgent(e.target.value)}
                style={{ background:'#0d1117', border:'1px solid #30363d', borderRadius:6, padding:'7px 10px', color:'#f0f6fc', fontSize:11 }}>
                {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <button onClick={submitTask} disabled={adding || !newTask.trim()} style={{
              padding:'7px 16px', borderRadius:6, fontSize:10, fontWeight:700, cursor:'pointer',
              background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.4)', color:'#4ade80',
              opacity: (adding || !newTask.trim()) ? 0.5 : 1,
            }}>{adding ? 'กำลังส่ง...' : '→ ส่ง Task'}</button>
          </div>
        )}

        {/* Kanban board */}
        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'#4b5563' }}>กำลังโหลด...</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, alignItems:'start' }}>
            {COLUMNS.map(col => (
              <div key={col.key} style={{ background:'#161b22', border:`1px solid ${col.color}22`, borderRadius:10, overflow:'hidden' }}>
                {/* Column header */}
                <div style={{ padding:'10px 14px', background:`${col.color}0d`, borderBottom:`1px solid ${col.color}22`, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:12 }}>{col.icon}</span>
                  <span style={{ fontSize:10, fontWeight:900, letterSpacing:1, color:col.color }}>{col.label}</span>
                  <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color:col.color, background:`${col.color}22`, borderRadius:20, padding:'1px 7px' }}>
                    {grouped[col.key]?.length ?? 0}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ padding:8, display:'flex', flexDirection:'column', gap:6, minHeight:80 }}>
                  {(grouped[col.key] ?? []).slice(0,20).map(t => (
                    <div key={t.id} style={{
                      background:'#0d1117', border:'1px solid #30363d', borderRadius:7,
                      padding:'9px 11px',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                        <div style={{ width:20, height:20, borderRadius:4, overflow:'hidden', flexShrink:0 }}>
                          <Image src={`/characters/${t.assigned_to.toLowerCase()}.png`} alt={t.assigned_to}
                            width={20} height={20} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        </div>
                        <span style={{ fontSize:9, fontWeight:700, color:'#60a5fa' }}>{t.assigned_to}</span>
                        <span style={{ marginLeft:'auto', fontSize:8, color:'#4b5563' }}>
                          {new Date(t.created_at).toLocaleDateString('th-TH', { month:'short', day:'numeric' })}
                        </span>
                      </div>
                      <div style={{ fontSize:10, color:'#8b949e', lineHeight:1.5, wordBreak:'break-word' }}>
                        {t.task_detail.length > 80 ? t.task_detail.slice(0,80) + '…' : t.task_detail}
                      </div>
                    </div>
                  ))}
                  {(grouped[col.key]?.length ?? 0) === 0 && (
                    <div style={{ textAlign:'center', padding:'20px 0', fontSize:10, color:'#4b5563' }}>— ว่างอยู่ —</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
