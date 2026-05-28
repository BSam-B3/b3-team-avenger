'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface KnowledgeEntry {
  id: string
  agent_id: string
  source: string
  content: string
  chunk_index: number
  created_at: string
}

const AGENTS_LIST = ['all','Janie','Joe','Enjoy','Fenton','Karn','Kitti','Nara','Metha','Pim','Win','Nam','Kom','Raps','Ferin','Exploiter','Chief']
const SOURCE_ICONS: Record<string, string> = {
  nightly:    '🌙',
  expedition: '🗺️',
  weekly:     '📚',
  midnight:   '🌙',
  email:      '📧',
  default:    '📄',
}

function sourceIcon(source: string): string {
  for (const [key, icon] of Object.entries(SOURCE_ICONS)) {
    if (source.includes(key)) return icon
  }
  return SOURCE_ICONS.default
}

export default function AssetsPage() {
  const [entries,    setEntries]    = useState<KnowledgeEntry[]>([])
  const [agent,      setAgent]      = useState('all')
  const [search,     setSearch]     = useState('')
  const [loading,    setLoading]    = useState(true)
  const [indexing,   setIndexing]   = useState(false)
  const [stats,      setStats]      = useState<{ total: number; agents: number; sources: number } | null>(null)
  const [expanded,   setExpanded]   = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const url = agent === 'all'
      ? '/api/assets?limit=100'
      : `/api/assets?agent_id=${agent}&limit=100`
    const d = await fetch(url).then(r => r.json())
    setEntries(d.entries ?? [])
    setStats(d.stats ?? null)
    setLoading(false)
  }
  useEffect(() => { load() }, [agent])

  const triggerIngest = async () => {
    setIndexing(true)
    await fetch('/api/knowledge/ingest')
    await load()
    setIndexing(false)
  }

  const filtered = search
    ? entries.filter(e => e.content.toLowerCase().includes(search.toLowerCase()) || e.source.includes(search))
    : entries

  return (
    <div style={{ minHeight:'100vh', background:'#0d1117', fontFamily:"'Segoe UI', system-ui, sans-serif", color:'#f0f6fc' }}>
      {/* Top bar */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(13,17,23,0.95)', borderBottom:'1px solid #30363d', display:'flex', alignItems:'center', gap:12, padding:'0 20px', height:44 }}>
        <div style={{ width:28, height:28, borderRadius:6, background:'linear-gradient(135deg,#7c3aed,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#fff' }}>B3</div>
        <div style={{ fontSize:9, fontWeight:900, letterSpacing:2 }}>TEAM AVENGER</div>
        <div style={{ width:1, height:18, background:'#30363d', margin:'0 4px' }} />
        <span style={{ fontSize:11, fontWeight:700, color:'#38bdf8' }}>🗂️ ASSETS / KNOWLEDGE BASE</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {[{label:'DASHBOARD',href:'/dashboard',color:'#60a5fa'},{label:'ANALYTICS',href:'/analytics',color:'#a855f7'},{label:'SETTINGS',href:'/settings',color:'#94a3b8'}].map(l => (
            <Link key={l.href} href={l.href} style={{ padding:'3px 10px', borderRadius:5, fontSize:9, fontWeight:700, background:`${l.color}18`, border:`1px solid ${l.color}33`, color:l.color, textDecoration:'none' }}>{l.label}</Link>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 20px' }}>
        {/* Stats */}
        {stats && (
          <div style={{ display:'flex', gap:12, marginBottom:16 }}>
            {[
              { label:'Total Chunks',  val: stats.total,   color:'#60a5fa' },
              { label:'Agents',        val: stats.agents,  color:'#a855f7' },
              { label:'Sources',       val: stats.sources, color:'#34d399' },
            ].map(s => (
              <div key={s.label} style={{ background:'#161b22', border:`1px solid ${s.color}22`, borderRadius:8, padding:'10px 16px' }}>
                <div style={{ fontSize:20, fontWeight:900, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:9, color:'#4b5563' }}>{s.label}</div>
              </div>
            ))}
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
              <button onClick={triggerIngest} disabled={indexing} style={{
                padding:'6px 14px', borderRadius:6, fontSize:10, fontWeight:700, cursor:'pointer',
                background:'rgba(56,189,248,0.12)', border:'1px solid rgba(56,189,248,0.3)',
                color:'#38bdf8', opacity: indexing ? 0.5 : 1,
              }}>
                {indexing ? '⏳ กำลัง index...' : '📥 Re-index .md files'}
              </button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display:'flex', gap:10, marginBottom:14 }}>
          <select value={agent} onChange={e => setAgent(e.target.value)}
            style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:6, padding:'5px 10px', color:'#f0f6fc', fontSize:11 }}>
            {AGENTS_LIST.map(a => <option key={a} value={a}>{a === 'all' ? 'All Agents' : a}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหา content หรือ source..."
            style={{ flex:1, background:'#161b22', border:'1px solid #30363d', borderRadius:6, padding:'5px 12px', color:'#f0f6fc', fontSize:11, outline:'none' }} />
          <button onClick={load} style={{ padding:'5px 12px', borderRadius:6, fontSize:10, background:'rgba(255,255,255,0.05)', border:'1px solid #30363d', color:'#8b949e', cursor:'pointer' }}>🔄</button>
        </div>

        {/* Entries */}
        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'#4b5563' }}>กำลังโหลด Knowledge Base...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:60 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
            <div style={{ color:'#4b5563', fontSize:12 }}>ยังไม่มีข้อมูลใน Knowledge Base</div>
            <div style={{ color:'#374151', fontSize:10, marginTop:8 }}>กด "Re-index .md files" เพื่อเริ่มต้น หรือรอ Midnight Hunter ทำงานคืนนี้</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {filtered.map(e => (
              <div key={e.id} style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:8, overflow:'hidden' }}>
                <div
                  onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', cursor:'pointer' }}
                >
                  <span style={{ fontSize:14 }}>{sourceIcon(e.source)}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:'#60a5fa', width:80, flexShrink:0 }}>{e.agent_id}</span>
                  <span style={{ fontSize:10, color:'#4b5563', flex:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                    {e.source}
                  </span>
                  <span style={{ fontSize:9, color:'#374151', flexShrink:0 }}>chunk #{e.chunk_index}</span>
                  <span style={{ fontSize:9, color:'#4b5563', flexShrink:0 }}>
                    {new Date(e.created_at).toLocaleDateString('th-TH')}
                  </span>
                  <span style={{ color:'#4b5563', fontSize:10 }}>{expanded === e.id ? '▲' : '▼'}</span>
                </div>

                {expanded === e.id && (
                  <div style={{ padding:'8px 14px 12px', borderTop:'1px solid #21262d' }}>
                    <pre style={{ margin:0, fontSize:10, color:'#8b949e', fontFamily:'monospace', lineHeight:1.7, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                      {e.content}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
