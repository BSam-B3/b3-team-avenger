'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export type RoomId = 'command' | 'meeting' | 'office'
type Task = { id:string; task_detail:string; assigned_to:string; status:string; created_at:string }
type Log  = { id:string; agent_name:string; action_desc:string; status:string; created_at:string }
type Panel = 'broadcast'|'tasks'|'report'|'alert'|null
type AgentMessage = { id:string; role:'user'|'agent'; content:string; created_at:string }
type AgentStatus = 'idle'|'working'|'busy'

const CHAR: Record<string,{outfit:string;role:string;th:string;desc:string}> = {
  Janie:  { outfit:'#7c3aed', role:'AI Orchestrator',  th:'คุณเจนนี่', desc:'ประสานงานทีม วางแผนงาน' },
  Enjoy:  { outfit:'#0e7490', role:'Frontend Engineer', th:'คุณเอ็นจอย', desc:'ออกแบบ UI/UX ทุกหน้า' },
  Joe:    { outfit:'#1e293b', role:'Backend Architect', th:'คุณโจ',     desc:'API, Database, Server' },
  Metha:  { outfit:'#4c1d95', role:'CFO',               th:'คุณเมธา',   desc:'วิเคราะห์การเงิน ROI' },
  Fenton: { outfit:'#475569', role:'Quality Officer',   th:'คุณเฟนตัน', desc:'ตรวจสอบ QA ทุก feature' },
  Karn:   { outfit:'#c2410c', role:'Marketing Lead',    th:'คุณกานต์',  desc:'แคมเปญ community KPI' },
  Kitti:  { outfit:'#1e40af', role:'Data Analytics',    th:'คุณกิตติ',  desc:'วิเคราะห์ข้อมูล insight' },
  Nara:   { outfit:'#db2777', role:'Content Creator',   th:'คุณนารา',   desc:'สร้าง content โซเชียล' },
  Pim:    { outfit:'#64748b', role:'UX Designer',       th:'คุณพิม',    desc:'ออกแบบ UX research' },
  Win:    { outfit:'#166534', role:'DevOps Engineer',   th:'คุณวิน',    desc:'CI/CD infrastructure' },
  Nam:    { outfit:'#1d4ed8', role:'Customer Support',  th:'คุณน้ำ',    desc:'ดูแลลูกค้า resolve ปัญหา' },
  Kom:    { outfit:'#334155', role:'Risk Officer',      th:'คุณคมน์',   desc:'ประเมิน risk mitigation' },
  Raps:   { outfit:'#a855f7', role:'HR & Copywriter',   th:'แรปส์',    desc:'HR policy, copywriting' },
}
const ROOM_AGENTS: Record<RoomId,string[]> = {
  command: ['Janie'],
  meeting: ['Joe','Enjoy','Metha','Fenton','Karn'],
  office:  ['Kitti','Nara','Pim','Win','Nam','Kom','Raps'],
}

// ─── Speech Bubble (framer-motion) ───────────────────────────────────────────
function SpeechBubble({ text }: { text: string }) {
  const short = text.length > 50 ? text.substring(0, 50) + '…' : text
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.82 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: -4, scale: 0.88  }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      className="absolute z-20 pointer-events-none"
      style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 }}
    >
      <div className="relative px-3 py-2 rounded-2xl text-[9px] font-semibold leading-tight shadow-xl"
        style={{
          maxWidth: 150, textAlign: 'center', whiteSpace: 'normal',
          background: 'rgba(255,255,255,0.96)',
          color: '#111827',
          border: '1.5px solid rgba(0,229,255,0.3)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 12px rgba(0,229,255,0.15)',
        }}>
        {short}
        {/* Arrow */}
        <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0"
          style={{ borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '8px solid rgba(255,255,255,0.96)' }} />
      </div>
    </motion.div>
  )
}

// ─── Agent Sprite (uses real PNG) ─────────────────────────────────────────────
function AgentSprite({ id, status='idle', speech='', sel=false, onSel, size=88 }:{
  id:string; status?:AgentStatus; speech?:string; sel?:boolean; onSel?:()=>void; size?:number
}) {
  const c = CHAR[id]; if (!c) return null
  const isWorking = status === 'working'
  const isBusy    = status === 'busy'
  const imgSize   = size

  const borderColor = sel ? '#c084fc' : isWorking ? '#10b981' : isBusy ? '#f59e0b' : 'rgba(255,255,255,0.08)'
  const glowStyle   = isWorking
    ? {boxShadow:`0 0 18px rgba(16,185,129,0.5), 0 0 40px rgba(16,185,129,0.2)`}
    : sel ? {boxShadow:`0 0 16px rgba(192,132,252,0.5)`}
    : {}

  return (
    <div className="relative flex flex-col items-center gap-1 cursor-pointer group" onClick={onSel}
      style={{width:imgSize+16}}>

      {/* Speech bubble — AnimatePresence for enter/exit */}
      <AnimatePresence>
        {speech && <SpeechBubble key={speech.slice(0,20)} text={speech} />}
      </AnimatePresence>

      {/* Portrait */}
      <div className="relative rounded-xl overflow-hidden transition-all duration-300"
        style={{width:imgSize, height:imgSize, border:`2px solid ${borderColor}`, ...glowStyle,
          opacity: status==='idle'&&!sel ? 0.75 : 1,
          transform: sel ? 'scale(1.05)' : isWorking ? 'scale(1.02)' : 'scale(1)',
        }}>
        <Image
          src={`/characters/${id.toLowerCase()}.png`}
          alt={id} width={imgSize} height={imgSize}
          className="w-full h-full object-cover"
          style={{imageRendering:'pixelated'}}
        />

        {/* Working overlay */}
        {isWorking && (
          <div className="absolute inset-0 bg-emerald-500/10"
            style={{animation:'glowPulse 1.5s ease-in-out infinite'}}/>
        )}
        {isBusy && (
          <div className="absolute inset-0 bg-amber-500/8"/>
        )}

        {/* Fire badge */}
        {isWorking && (
          <div className="absolute top-1 right-1 text-base leading-none"
            style={{animation:'fireFlicker 0.6s ease-in-out infinite alternate'}}>🔥</div>
        )}
        {isBusy && (
          <div className="absolute top-1 right-1 text-sm leading-none">⏳</div>
        )}

        {/* Online dot */}
        <div className="absolute bottom-1.5 left-1.5 w-2 h-2 rounded-full border border-[#07071a]"
          style={{background: isWorking?'#10b981':isBusy?'#f59e0b':'#4b5563',
            animation: isWorking||isBusy?'glowPulse 1.2s ease-in-out infinite':'none'}}/>
      </div>

      {/* Name */}
      <div className={`text-[10px] font-bold text-center leading-tight ${
        sel?'text-purple-300':isWorking?'text-emerald-400':isBusy?'text-amber-400':'text-white/55'
      }`}>{id}</div>

      {/* Status text */}
      <div className={`text-[8px] text-center leading-none ${
        isWorking?'text-emerald-500':isBusy?'text-amber-500':'text-white/20'
      }`}>
        {isWorking?'Working...':isBusy?'Waiting...':'Idle'}
      </div>
    </div>
  )
}

// ─── Rooms (HTML/CSS with real portraits) ────────────────────────────────────

function RoomCommand({ sel, onSel, statuses, speeches }: {
  sel:string|null; onSel:(id:string)=>void; statuses:Record<string,AgentStatus>; speeches:Record<string,string>
}) {
  const s = statuses['Janie'] ?? 'idle'
  return (
    <div className="relative w-full overflow-hidden flex items-center justify-center"
      style={{minHeight:240, background:'linear-gradient(135deg,#0a0820 0%,#0d063a 50%,#0a0820 100%)'}}>

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-32"
          style={{background:'radial-gradient(ellipse at 50% 0%,rgba(124,58,237,0.15) 0%,transparent 70%)'}}/>
        {/* Scan lines */}
        <div className="absolute inset-0" style={{backgroundImage:'repeating-linear-gradient(transparent 0px,transparent 3px,rgba(88,28,235,0.04) 3px,rgba(88,28,235,0.04) 4px)'}}/>
      </div>

      {/* Left data panels */}
      <div className="absolute left-4 top-4 bottom-4 w-48 flex flex-col gap-2 pointer-events-none">
        <div className="rounded-lg border border-blue-500/20 p-2" style={{background:'rgba(13,13,60,0.7)'}}>
          <div className="text-[8px] font-bold text-blue-400 tracking-widest mb-1">COMMAND DISPLAY</div>
          {[60,85,45,70,90,55].map((w,i)=>(
            <div key={i} className="flex gap-1 items-center mb-0.5">
              <div className="h-1.5 bg-blue-900/60 rounded" style={{width:40}}/>
              <div className="h-1.5 bg-blue-600/50 rounded transition-all" style={{width:`${w}%`,maxWidth:80}}>
                <div className="h-full bg-blue-400/70 rounded" style={{animation:`dataFlow ${1.5+i*0.3}s ease-in-out infinite alternate`}}/>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-indigo-500/20 p-2" style={{background:'rgba(13,13,60,0.7)'}}>
          <div className="text-[8px] font-bold text-indigo-400 tracking-widest mb-1">SYSTEM STATUS</div>
          {['API','AI','DB','NET'].map((lbl,i)=>(
            <div key={lbl} className="flex justify-between items-center mb-0.5">
              <span className="text-[8px] text-indigo-300/50">{lbl}</span>
              <span className="text-[8px] text-green-400">● OK</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="absolute right-4 top-4 bottom-4 w-36 flex flex-col gap-2 pointer-events-none">
        <div className="rounded-lg border border-purple-500/20 p-2 text-center" style={{background:'rgba(13,13,60,0.7)'}}>
          <div className="text-[8px] font-bold text-purple-400 tracking-widest mb-2">B3 HQ</div>
          <div className="text-lg font-black text-purple-300">B3</div>
          <div className="text-[7px] text-purple-500/60">9CJ CORP</div>
        </div>
        <div className="flex items-center justify-center gap-2 rounded-lg border border-yellow-500/20 p-2" style={{background:'rgba(13,13,40,0.7)'}}>
          <span className="text-xl">👑</span>
          <div>
            <div className="text-[8px] font-bold text-yellow-300">YOU</div>
            <div className="text-[7px] text-yellow-500/50">Director</div>
          </div>
        </div>
      </div>

      {/* Center: Janie large portrait */}
      <div className="flex flex-col items-center gap-3 z-10">
        <div className="text-[9px] font-bold tracking-[0.3em] text-purple-400/60">COMMAND CENTER</div>
        <AgentSprite id="Janie" status={s} speech={speeches['Janie']??''} sel={sel==='Janie'} onSel={()=>onSel('Janie')} size={140}/>
        {s === 'idle' && (
          <div className="text-[10px] text-purple-300/50 animate-pulse">คลิกเพื่อสนทนา →</div>
        )}
      </div>
    </div>
  )
}

function RoomMeeting({ sel, onSel, statuses, speeches }: {
  sel:string|null; onSel:(id:string)=>void; statuses:Record<string,AgentStatus>; speeches:Record<string,string>
}) {
  const agents = ROOM_AGENTS.meeting
  return (
    <div className="relative w-full overflow-hidden flex flex-col items-center justify-center gap-2"
      style={{minHeight:240, background:'linear-gradient(180deg,#0b0a2c 0%,#0d0820 100%)'}}>

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Lights */}
        {[20,50,80].map((x,i)=>(
          <div key={x} className="absolute top-0 rounded-full"
            style={{left:`${x}%`,transform:'translateX(-50%)',width:4,height:14,background:'#fffde7',opacity:0.5,
              boxShadow:'0 0 20px 8px rgba(255,253,231,0.1)',animation:`lightFlicker ${3+i*0.5}s ease-in-out infinite`}}/>
        ))}
        <div className="absolute inset-0" style={{backgroundImage:'repeating-linear-gradient(transparent 0px,transparent 3px,rgba(88,28,235,0.03) 3px,rgba(88,28,235,0.03) 4px)'}}/>
      </div>

      {/* Screen at the top */}
      <div className="relative z-10 w-[70%] rounded-lg border border-blue-500/20 p-2 text-center"
        style={{background:'rgba(6,13,28,0.9)'}}>
        <div className="text-[9px] font-bold text-blue-400 tracking-widest mb-1">📊 WEEKLY SPRINT PLAN</div>
        <div className="flex gap-2 justify-center">
          {['Design','Dev','QA','Deploy'].map((t,i)=>(
            <div key={t} className="flex flex-col items-center gap-0.5">
              <div className="h-1.5 rounded" style={{width:40,background:'#1e3a5a'}}>
                <div className="h-full rounded bg-blue-500/60" style={{width:`${[70,45,90,30][i]}%`,transition:'width 1s'}}/>
              </div>
              <div className="text-[7px] text-blue-300/40">{t}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Conference table line */}
      <div className="relative z-10 w-[85%] h-2 rounded-full" style={{background:'rgba(74,50,24,0.6)',border:'1px solid rgba(107,66,24,0.4)'}}/>

      {/* Agents row */}
      <div className="relative z-10 flex items-end justify-center gap-3 px-4">
        {agents.map(id => (
          <AgentSprite key={id} id={id} status={statuses[id]??'idle'} speech={speeches[id]??''} sel={sel===id} onSel={()=>onSel(id)} size={80}/>
        ))}
      </div>
    </div>
  )
}

function RoomOffice({ sel, onSel, statuses, speeches }: {
  sel:string|null; onSel:(id:string)=>void; statuses:Record<string,AgentStatus>; speeches:Record<string,string>
}) {
  const row1 = ['Kitti','Nara','Pim','Win']
  const row2 = ['Nam','Kom','Raps']
  return (
    <div className="relative w-full overflow-hidden flex flex-col"
      style={{minHeight:260, background:'linear-gradient(180deg,#0e0a06 0%,#160e0a 60%,#1a1008 100%)'}}>

      {/* Back wall + windows */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{height:'45%'}}>
        {/* Wall */}
        <div className="absolute inset-0" style={{background:'linear-gradient(180deg,#0c0804 0%,#100a06 100%)'}}/>
        {/* Windows */}
        {[5,22,38,54,70,82].map((left,i)=>(
          <div key={left} className="absolute rounded-sm overflow-hidden"
            style={{left:`${left}%`,top:4,width:'10%',height:'75%',
              background:'linear-gradient(180deg,#0f2d5a 0%,#0a1e3a 100%)',
              border:'1px solid #1e2a42',boxShadow:'inset 0 0 8px rgba(30,100,200,0.1)'}}>
            <div className="absolute inset-0 opacity-30" style={{backgroundImage:'linear-gradient(90deg,rgba(255,255,255,0.05) 50%,transparent 50%)',backgroundSize:'50% 100%'}}/>
            {/* City lights in window */}
            {i%2===0 && <div className="absolute bottom-2 left-1 right-1 h-3" style={{background:'linear-gradient(90deg,#0a1428 0%,#0d1e40 50%,#0a1428 100%)'}}/>}
          </div>
        ))}
        {/* Ceiling lights */}
        {[20,50,80].map((x,i)=>(
          <div key={x} className="absolute bottom-0"
            style={{left:`${x}%`,transform:'translateX(-50%)',width:64,height:3,
              background:'rgba(200,200,255,0.15)',
              boxShadow:'0 0 20px 6px rgba(200,200,255,0.04)',
              animation:`lightFlicker ${6+i}s ease-in-out infinite`}}/>
        ))}
        {/* Company sign */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded"
          style={{background:'rgba(10,10,30,0.8)',border:'1px solid rgba(129,140,248,0.2)'}}>
          <span className="text-[8px] font-bold text-indigo-400/70 tracking-widest">9CJ CORP · B3 TEAM AVENGER</span>
        </div>
      </div>

      {/* Whiteboard (right side) */}
      <div className="absolute pointer-events-none" style={{right:'2%',top:'5%',width:'10%',height:'36%',background:'#f0f0e8',borderRadius:2,border:'2px solid #8B4513'}}>
        <div className="absolute top-0 left-0 right-0 h-1" style={{background:'#8B4513'}}/>
        <div className="p-1">
          <div className="text-[5px] font-bold text-gray-800 mb-0.5">B3 PLAN</div>
          {['Story','Code','Design','Deploy'].map(t=>(
            <div key={t} className="text-[4.5px] text-gray-600">— {t}</div>
          ))}
        </div>
      </div>

      {/* Plant (left corner) */}
      <div className="absolute pointer-events-none" style={{left:'0%',bottom:'30%'}}>
        <div className="text-3xl" style={{filter:'saturate(0.8) brightness(0.7)'}}>🌿</div>
      </div>

      {/* Bookshelf (far right) */}
      <div className="absolute right-0 top-0 bottom-0 pointer-events-none" style={{width:'4%',background:'rgba(42,24,8,0.6)',borderLeft:'1px solid rgba(74,50,24,0.3)'}}>
        {[0,1,2,3,4,5].map(i=>(
          <div key={i} className="mx-0.5 rounded-sm my-0.5" style={{height:12,background:['#7c3aed','#1d4ed8','#065f46','#92400e','#c2410c','#334155'][i],opacity:0.7}}/>
        ))}
      </div>

      {/* Floor */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{height:'28%',background:'linear-gradient(180deg,#1a0f06 0%,#120a04 100%)'}}>
        {/* Wood plank lines */}
        {[0,1,2].map(i=>(
          <div key={i} className="absolute left-0 right-0 h-px" style={{top:`${30+i*30}%`,background:'rgba(74,50,24,0.3)'}}/>
        ))}
      </div>

      {/* Row 1 (back desks) */}
      <div className="absolute flex justify-around items-end px-12"
        style={{bottom:'47%',left:0,right:'4%',zIndex:10}}>
        {row1.map(id => (
          <div key={id} className="flex flex-col items-center gap-0">
            {/* Desk surface */}
            <AgentSprite id={id} status={statuses[id]??'idle'} speech={speeches[id]??''} sel={sel===id} onSel={()=>onSel(id)} size={72}/>
            <div className="rounded-sm" style={{width:88,height:7,background:'linear-gradient(180deg,#6b4a28 0%,#4a3218 100%)',marginTop:2}}/>
          </div>
        ))}
      </div>

      {/* Aisle divider */}
      <div className="absolute left-0 right-0 pointer-events-none" style={{bottom:'44%',height:3,background:'rgba(42,24,8,0.4)',zIndex:9}}/>

      {/* Row 2 (front desks) */}
      <div className="absolute flex justify-around items-end px-24"
        style={{bottom:'12%',left:0,right:'4%',zIndex:10}}>
        {row2.map(id => (
          <div key={id} className="flex flex-col items-center gap-0">
            <AgentSprite id={id} status={statuses[id]??'idle'} speech={speeches[id]??''} sel={sel===id} onSel={()=>onSel(id)} size={72}/>
            <div className="rounded-sm" style={{width:88,height:7,background:'linear-gradient(180deg,#6b4a28 0%,#4a3218 100%)',marginTop:2}}/>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Agent Roster ─────────────────────────────────────────────────────────────
function AgentRoster({ statuses, speeches, sel, onSel, tasks }: {
  statuses:Record<string,AgentStatus>; speeches:Record<string,string>
  sel:string|null; onSel:(id:string)=>void
  tasks:{assigned_to:string;status:string;task_detail:string}[]
}) {
  const sections = [
    {room:'command' as RoomId, label:'Command', icon:'🎖'},
    {room:'meeting' as RoomId, label:'Meeting',  icon:'🤝'},
    {room:'office'  as RoomId, label:'Office',   icon:'💼'},
  ]
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-white/6 shrink-0">
        <div className="text-[9px] font-black text-white/40 tracking-widest">AI AGENTS</div>
        <div className="text-[8px] text-white/20">13 members · live</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sections.map(({room,label,icon})=>(
          <div key={room}>
            <div className="px-3 pt-2 pb-0.5 text-[8px] font-bold text-white/20 tracking-wider">{icon} {label.toUpperCase()}</div>
            {ROOM_AGENTS[room].map(agentId=>{
              const c = CHAR[agentId]
              const st = statuses[agentId] ?? 'idle'
              const isSel = sel === agentId
              const hasSpeech = !!speeches[agentId]
              const task = tasks.find(t=>t.assigned_to===agentId&&(t.status==='in_progress'||t.status==='pending'))
              return (
                <button key={agentId} onClick={()=>onSel(agentId)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-left transition-all hover:bg-white/5 ${isSel?'bg-purple-900/25 border-r-2 border-purple-500':'border-r-2 border-transparent'}`}>
                  {/* Mini portrait */}
                  <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 relative"
                    style={{border:`1.5px solid ${st==='working'?'#10b981':st==='busy'?'#f59e0b':isSel?'#a855f7':'rgba(255,255,255,0.1)'}`,
                      boxShadow:st==='working'?'0 0 8px rgba(16,185,129,0.4)':'none'}}>
                    <Image src={`/characters/${agentId.toLowerCase()}.png`} alt={agentId} width={28} height={28} className="w-full h-full object-cover"/>
                    {/* Status dot */}
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#05050e]"
                      style={{background:st==='working'?'#10b981':st==='busy'?'#f59e0b':'#374151'}}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-bold truncate ${isSel?'text-purple-200':'text-white/75'}`}>{agentId}</span>
                      {hasSpeech&&<span className="text-[7px] animate-bounce">💬</span>}
                    </div>
                    <div className={`text-[8px] truncate ${st==='working'?'text-emerald-400':st==='busy'?'text-amber-400':'text-white/20'}`}>
                      {st==='working'&&task ? task.task_detail.substring(0,16)+'…' : st==='working'?'Working...':st==='busy'?'Waiting...':'Idle'}
                    </div>
                  </div>
                  {st==='working'&&<span className="text-[8px] text-emerald-400 shrink-0" style={{animation:'typingPulse 0.8s ease-in-out infinite'}}>▶</span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Agent Profile Card (popup when selected) ────────────────────────────────
function AgentProfileCard({ id, status, task, lastMsg, onClose }: {
  id:string; status:AgentStatus
  task?:{task_detail:string;status:string}; lastMsg?:string; onClose:()=>void
}) {
  const c = CHAR[id]
  if (!c) return null
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4"
      style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',animation:'panelIn 0.2s ease-out'}}>
      <div className="relative rounded-2xl p-5 w-full max-w-xs"
        style={{background:'linear-gradient(135deg,#100828 0%,#08060f 100%)',border:`1px solid ${c.outfit}40`}}>
        <button onClick={onClose} className="absolute top-3 right-3 text-white/30 hover:text-white/70 text-sm">✕</button>

        <div className="flex gap-4 items-start mb-4">
          <div className="rounded-xl overflow-hidden shrink-0" style={{width:80,height:80,border:`2px solid ${c.outfit}60`}}>
            <Image src={`/characters/${id.toLowerCase()}.png`} alt={id} width={80} height={80} className="w-full h-full object-cover"/>
          </div>
          <div>
            <div className="text-white font-black text-lg">{id}</div>
            <div className="text-[10px] font-bold tracking-widest uppercase" style={{color:c.outfit}}>{c.role}</div>
            <div className={`flex items-center gap-1 mt-1 text-[9px] font-bold ${status==='working'?'text-emerald-400':status==='busy'?'text-amber-400':'text-white/30'}`}>
              <span className="w-1.5 h-1.5 rounded-full inline-block"
                style={{background:status==='working'?'#10b981':status==='busy'?'#f59e0b':'#374151',
                  animation:status!=='idle'?'glowPulse 1s ease-in-out infinite':'none'}}/>
              {status==='working'?'กำลังทำงาน':status==='busy'?'มี task รอ':'ว่างงาน'}
            </div>
          </div>
        </div>

        <div className="text-[9px] text-white/40 mb-1">คำอธิบาย</div>
        <div className="text-[10px] text-white/60 mb-3">{c.desc}</div>

        {task && (
          <>
            <div className="text-[9px] text-white/40 mb-1">งานปัจจุบัน</div>
            <div className="rounded-lg px-2 py-1.5 mb-3 text-[9px] text-white/70"
              style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
              {task.task_detail.substring(0,80)}
            </div>
          </>
        )}

        {lastMsg && (
          <>
            <div className="text-[9px] text-white/40 mb-1">ข้อความล่าสุด</div>
            <div className="rounded-lg px-2 py-1.5 text-[9px] text-white/60 italic"
              style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
              "{lastMsg.substring(0,80)}{lastMsg.length>80?'…':''}"
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── System Console ───────────────────────────────────────────────────────────
function SystemConsole({ logs }: { logs:Log[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(()=>{ if(ref.current) ref.current.scrollTop=ref.current.scrollHeight },[logs])
  return (
    <div className="flex flex-col shrink-0" style={{height:110,background:'#040408',borderTop:'1px solid rgba(99,102,241,0.1)'}}>
      <div className="flex items-center gap-2 px-3 py-1 shrink-0 border-b border-white/5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{animation:'glowPulse 1.5s ease-in-out infinite'}}/>
        <span className="text-[8px] font-black text-white/35 tracking-widest">SYSTEM CONSOLE</span>
        <span className="ml-auto text-[7px] text-white/15 font-mono">{logs.length} events</span>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto px-3 py-1 space-y-px font-mono">
        {[...logs].reverse().slice(0,25).map((l,i)=>(
          <div key={l.id??i} className="flex gap-2 items-baseline py-px">
            <span className="text-[7px] text-white/12 shrink-0 tabular-nums">
              {new Date(l.created_at).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
            </span>
            <span className={`text-[8px] font-bold shrink-0 ${l.status==='completed'?'text-emerald-400':l.status==='running'?'text-cyan-400':'text-red-400'}`}>[{l.agent_name}]</span>
            <span className="text-[8px] text-white/30 truncate">{l.action_desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Action Panels ────────────────────────────────────────────────────────────
function PanelBroadcast({room,onClose}:{room:RoomId;onClose:()=>void}) {
  const agents=ROOM_AGENTS[room],[msg,setMsg]=useState(''),[sending,setSending]=useState(false),[result,setResult]=useState<string|null>(null)
  const send=async()=>{if(!msg.trim())return;setSending(true);try{const res=await fetch('/api/agent-bridge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({directive:`${agents.join(', ')}: ${msg.trim()}`})});const d=await res.json();setResult(res.ok?`✅ ส่งแล้ว`:`❌ ${d.error}`);if(res.ok)setMsg('')}catch{setResult('❌ Error')}finally{setSending(false)}}
  return(<div className="space-y-3"><div className="flex items-center justify-between"><span className="text-cyan-300 text-xs font-bold">📡 BROADCAST</span><button onClick={onClose} className="text-white/20 hover:text-white/60 text-xs">✕</button></div><div className="text-[10px] text-white/30">→ {agents.join(' · ')}</div><textarea value={msg} onChange={e=>setMsg(e.target.value)} rows={3} placeholder="ข้อความ..." className="w-full bg-white/5 border border-cyan-500/20 rounded-lg px-3 py-2 text-xs text-white placeholder-white/15 focus:outline-none resize-none"/><button onClick={send} disabled={!msg.trim()||sending} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-white text-[10px] font-bold py-2 rounded-lg transition-all">{sending?'◈':'📡 BROADCAST'}</button>{result&&<p className={`text-[10px] ${result.startsWith('✅')?'text-green-400':'text-red-400'}`}>{result}</p>}</div>)
}
function PanelTasks({room,tasks}:{room:RoomId;tasks:Task[]}) {
  const rt=tasks.filter(t=>ROOM_AGENTS[room].includes(t.assigned_to))
  return(<div className="space-y-2"><span className="text-purple-300 text-xs font-bold">📋 TASKS</span>{rt.length===0&&<p className="text-white/20 text-xs text-center py-4">ยังไม่มี Task</p>}{(['pending','in_progress','done'] as const).map(k=>{const items=rt.filter(t=>t.status===k);if(!items.length)return null;const colors:{[key:string]:string}={pending:'text-yellow-400',in_progress:'text-cyan-400',done:'text-green-400'};return(<div key={k}><div className={`text-[9px] font-bold ${colors[k]} mb-1`}>{k} ({items.length})</div>{items.slice(0,3).map(t=><div key={t.id} className="bg-white/5 rounded px-2 py-1 mb-1"><div className="text-[9px] text-purple-300/70 font-bold">{t.assigned_to}</div><div className="text-[9px] text-white/50 truncate">{t.task_detail}</div></div>)}</div>)})}</div>)
}
function PanelReport({tasks,logs}:{tasks:Task[];logs:Log[]}) {
  const[done,prog,pend]=[tasks.filter(t=>t.status==='done').length,tasks.filter(t=>t.status==='in_progress').length,tasks.filter(t=>t.status==='pending').length]
  return(<div className="space-y-3"><span className="text-green-300 text-xs font-bold">📊 REPORT</span><div className="grid grid-cols-3 gap-2">{[['✅',done,'text-green-400','Done'],['⚡',prog,'text-cyan-400','Active'],['⏳',pend,'text-yellow-400','Wait']].map(([ico,val,cls,lbl])=><div key={String(lbl)} className="bg-white/5 rounded-lg p-2 text-center"><div className="text-base">{ico}</div><div className={`text-lg font-black ${cls}`}>{val}</div><div className="text-[8px] text-white/30">{lbl}</div></div>)}</div>{logs.slice(-4).reverse().map(l=><div key={l.id} className="flex gap-1.5 items-center"><span className={`text-[8px] font-bold ${l.status==='completed'?'text-green-400':'text-cyan-400'}`}>●</span><span className="text-[9px] text-purple-300/60 shrink-0">[{l.agent_name}]</span><span className="text-[9px] text-white/40 truncate">{l.action_desc}</span></div>)}</div>)
}
function PanelAlert({room,onClose}:{room:RoomId;onClose:()=>void}) {
  const agents=ROOM_AGENTS[room],[target,setTarget]=useState('ALL'),[msg,setMsg]=useState(''),[sending,setSending]=useState(false),[result,setResult]=useState<string|null>(null)
  const send=async()=>{if(!msg.trim())return;setSending(true);const to=target==='ALL'?agents.join(', '):target;try{const res=await fetch('/api/agent-bridge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({directive:`🔴 URGENT — ${to}: ${msg.trim()}`})});const d=await res.json();setResult(res.ok?'✅ ส่งแล้ว!':`❌ ${d.error}`);if(res.ok)setMsg('')}catch{setResult('❌ Error')}finally{setSending(false)}}
  return(<div className="space-y-3"><div className="flex items-center justify-between"><span className="text-red-400 text-xs font-bold">🔔 ALERT</span><button onClick={onClose} className="text-white/20 hover:text-white/60 text-xs">✕</button></div><select value={target} onChange={e=>setTarget(e.target.value)} className="w-full bg-white/5 border border-red-500/20 rounded px-2 py-1.5 text-xs text-white focus:outline-none"><option value="ALL">🔴 ทุกคน</option>{agents.map(a=><option key={a} value={a}>{a}</option>)}</select><textarea value={msg} onChange={e=>setMsg(e.target.value)} rows={3} placeholder="ข้อความด่วน..." className="w-full bg-white/5 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder-white/15 focus:outline-none resize-none"/><button onClick={send} disabled={!msg.trim()||sending} className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white text-[10px] font-bold py-2 rounded-lg animate-pulse">{sending?'◈':'🔔 SEND'}</button>{result&&<p className={`text-[10px] ${result.startsWith('✅')?'text-green-400':'text-red-400'}`}>{result}</p>}</div>)
}

const ROOMS=[{id:'command' as RoomId,icon:'🎖',th:'บัญชาการ'},{id:'meeting' as RoomId,icon:'🤝',th:'ประชุม'},{id:'office' as RoomId,icon:'💼',th:'สำนักงาน'}]

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PixelCommandCenter({
  fullPage=false,initialRoom,onExit,onEnterRoom,tasks=[],logs=[],
}:{fullPage?:boolean;initialRoom?:RoomId;onExit?:()=>void;onEnterRoom?:(r:RoomId)=>void;tasks?:Task[];logs?:Log[]}) {
  const [room,         setRoom]          = useState<RoomId>(initialRoom??'command')
  const [sel,          setSel]           = useState<string|null>(null)
  const [showCard,     setShowCard]      = useState(false)
  const [panel,        setPanel]         = useState<Panel>(null)
  const [dir,          setDir]           = useState('')
  const [sending,      setSending]       = useState(false)
  const [agentTyping,  setAgentTyping]   = useState(false)
  const [messages,     setMessages]      = useState<AgentMessage[]>([])
  const [agentStatuses,setAgentStatuses] = useState<Record<string,AgentStatus>>({})
  const [speechBubbles,setSpeechBubbles] = useState<Record<string,string>>({})
  const [lastMsgs,     setLastMsgs]      = useState<Record<string,string>>({})
  const [liveLogs,     setLiveLogs]      = useState<Log[]>(logs)
  const [tick,         setTick]          = useState(0)
  const msgEndRef = useRef<HTMLDivElement>(null)
  const timerRefs = useRef<Record<string,ReturnType<typeof setTimeout>>>({})

  const fetchStatuses = useCallback(async()=>{
    try{const sb=createClient();const{data}=await sb.from('agent_tasks').select('assigned_to,status').in('status',['pending','in_progress']);const s:Record<string,AgentStatus>={};(data??[]).forEach(t=>{if(t.status==='in_progress')s[t.assigned_to]='working';else if(t.status==='pending'&&!s[t.assigned_to])s[t.assigned_to]='busy'});setAgentStatuses(s)}catch{}
  },[])

  useEffect(()=>{fetchStatuses();const iv=setInterval(fetchStatuses,8000);return()=>clearInterval(iv)},[fetchStatuses])
  useEffect(()=>{const sb=createClient();const ch=sb.channel('task-watch').on('postgres_changes',{event:'*',schema:'public',table:'agent_tasks'},fetchStatuses).subscribe();return()=>{sb.removeChannel(ch)}},[fetchStatuses])

  useEffect(()=>{
    const sb=createClient()
    const ch=sb.channel('speech-global').on('postgres_changes',{event:'INSERT',schema:'public',table:'agent_messages'},(payload)=>{
      const row=payload.new as{agent_id?:string;role?:string;content?:string;created_at?:string;id?:string}
      if(row.role!=='agent'||!row.agent_id||!row.content)return
      const aid=row.agent_id
      setSpeechBubbles(prev=>({...prev,[aid]:row.content!}))
      setLastMsgs(prev=>({...prev,[aid]:row.content!}))
      if(timerRefs.current[aid])clearTimeout(timerRefs.current[aid])
      timerRefs.current[aid]=setTimeout(()=>setSpeechBubbles(prev=>{const n={...prev};delete n[aid];return n}),7000)
      setLiveLogs(prev=>[...prev.slice(-49),{id:row.id??String(Date.now()),agent_name:aid,action_desc:`"${row.content!.substring(0,60)}${row.content!.length>60?'…':''}"`,status:'completed',created_at:row.created_at??new Date().toISOString()}])
    }).subscribe()
    return()=>{sb.removeChannel(ch);Object.values(timerRefs.current).forEach(clearTimeout)}
  },[])

  useEffect(()=>{const sb=createClient();const ch=sb.channel('logs-feed').on('postgres_changes',{event:'INSERT',schema:'public',table:'agent_logs'},(payload)=>{setLiveLogs(prev=>[...prev.slice(-49),payload.new as Log])}).subscribe();return()=>{sb.removeChannel(ch)}},[])

  const tickers:Record<RoomId,string[]>={
    command:['◈  ห้องบัญชาการ — Janie AI Orchestrator พร้อมรับคำสั่ง','◈  B3 Team Avenger · 9CJ Corp · All systems go'],
    meeting:['◈  ห้องประชุม — Joe · Enjoy · Metha · Fenton · Karn','◈  Sprint Planning Board — คลิกตัวละครเพื่อสนทนา'],
    office: ['◈  สำนักงาน Row 1: Kitti Nara Pim Win | Row 2: Nam Kom Raps','◈  กล่องขาวเหนือหัว = realtime message จาก AI'],
  }
  useEffect(()=>{const t=setInterval(()=>setTick(i=>(i+1)%2),3400);return()=>clearInterval(t)},[])
  useEffect(()=>{setTick(0);setSel(null);setPanel(null);setMessages([]);setShowCard(false)},[room])
  useEffect(()=>{msgEndRef.current?.scrollIntoView({behavior:'smooth'})},[messages,agentTyping])
  useEffect(()=>{setLiveLogs(logs)},[logs])

  const loadMessages=useCallback(async(aid:string)=>{try{const res=await fetch(`/api/agent-bridge/chat?agent_id=${encodeURIComponent(aid)}`);if(res.ok){const d=await res.json();setMessages(d.messages??[])}}catch{}},[])

  const handleSel=(id:string)=>{
    if(sel===id){setSel(null);setMessages([]);setShowCard(false);return}
    setSel(id);setDir('');setPanel(null);loadMessages(id)
    setShowCard(false)
  }

  useEffect(()=>{
    if(!sel)return
    const sb=createClient()
    const ch=sb.channel(`chat-${sel}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'agent_messages',filter:`agent_id=eq.${sel}`},(payload)=>{
      const row=payload.new as AgentMessage;setMessages(prev=>prev.some(m=>m.id===row.id)?prev:[...prev,row])
    }).subscribe()
    return()=>{sb.removeChannel(ch)}
  },[sel])

  const switchRoom=(r:RoomId)=>{if(!fullPage&&onEnterRoom){onEnterRoom(r)}else{setRoom(r)}}

  const sendChat=async()=>{
    if(!dir.trim()||!sel||sending)return
    const content=dir.trim();setDir('');setSending(true);setAgentTyping(true)
    const tempId=`temp-${Date.now()}`
    setMessages(prev=>[...prev,{id:tempId,role:'user',content,created_at:new Date().toISOString()}])
    try{
      const res=await fetch('/api/agent-bridge/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent_id:sel,message:content})})
      const d=await res.json()
      if(res.ok){setMessages(prev=>[...prev.filter(m=>m.id!==tempId),{id:d.user_message_id,role:'user' as const,content,created_at:new Date().toISOString()},{id:d.agent_message_id,role:'agent' as const,content:d.reply,created_at:new Date().toISOString()}])}
      else{setMessages(prev=>prev.filter(m=>m.id!==tempId))}
    }catch{setMessages(prev=>prev.filter(m=>m.id!==tempId))}
    finally{setSending(false);setAgentTyping(false)}
  }

  const actionBtns=[{id:'broadcast' as Panel,icon:'📡',label:'Broadcast',cls:'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10'},{id:'tasks' as Panel,icon:'📋',label:'Tasks',cls:'border-purple-500/30 text-purple-400 hover:bg-purple-500/10'},{id:'report' as Panel,icon:'📊',label:'Report',cls:'border-green-500/30 text-green-400 hover:bg-green-500/10'},{id:'alert' as Panel,icon:'🔔',label:'Alert',cls:'border-red-500/30 text-red-400 hover:bg-red-500/10'}]
  const activeCount=Object.values(agentStatuses).filter(s=>s==='working').length
  const busyCount=Object.values(agentStatuses).filter(s=>s==='busy').length

  return (
    <>
      <style>{`
        @keyframes speechIn    {from{opacity:0;transform:translateX(-50%) translateY(-8px) scale(0.8)} to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
        @keyframes glowPulse   {0%,100%{opacity:0.6} 50%{opacity:1}}
        @keyframes fireFlicker {from{transform:scale(1) rotate(-3deg)} to{transform:scale(1.15) rotate(3deg)}}
        @keyframes dataFlow    {from{width:40%} to{width:100%}}
        @keyframes lightFlicker{0%,100%{opacity:0.5} 50%{opacity:0.8}}
        @keyframes roomIn      {from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)}}
        @keyframes tickIn      {from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:translateX(0)}}
        @keyframes panelIn     {from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)}}
        @keyframes typingPulse {0%,100%{opacity:0.3} 50%{opacity:1}}
      `}</style>

      <div className={`w-full rounded-xl overflow-hidden border border-purple-500/15 select-none ${fullPage?'flex flex-col':''}`} style={{background:'#07071a'}}>

        {/* Tab bar */}
        <div className="flex items-center px-3 pt-2.5 border-b border-white/6 gap-0.5 shrink-0" style={{background:'#06060f'}}>
          {/* Back button removed — navigation handled by top nav tabs */}
          {ROOMS.map(r=>(
            <button key={r.id} onClick={()=>switchRoom(r.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-[10px] font-bold tracking-wider transition-all border-b-2 ${room===r.id&&fullPage?'bg-[#0d0d28] border-purple-500 text-purple-200':'bg-transparent border-transparent text-white/25 hover:text-white/60 hover:bg-white/5'}`}>
              {r.icon} {r.th}
            </button>
          ))}
          {fullPage&&<div className="ml-2 flex gap-1.5">{activeCount>0&&<span className="text-[9px] bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30">💻 {activeCount}</span>}{busyCount>0&&<span className="text-[9px] bg-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-500/30">⚡ {busyCount}</span>}</div>}
          {!fullPage&&<span className="ml-auto text-[8px] text-purple-400/30 font-mono pb-1.5 animate-pulse">▶ คลิกห้องเพื่อเข้า</span>}
          {fullPage&&<span className="ml-auto text-[8px] text-purple-400/15 font-mono pb-1.5 pr-1">9CJ · B3 HQ</span>}
        </div>

        {fullPage ? (
          <div className="flex flex-row flex-1 min-h-0">

            {/* LEFT: Agent Roster */}
            <div className="hidden lg:flex flex-col w-44 shrink-0 border-r border-white/6 overflow-hidden" style={{background:'#05050e'}}>
              <AgentRoster statuses={agentStatuses} speeches={speechBubbles} sel={sel} onSel={handleSel} tasks={tasks}/>
            </div>

            {/* CENTER: Room + chat + console */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

              {/* Room */}
              <div key={room} className="relative" style={{animation:'roomIn 0.25s ease-out'}}>
                {/* Profile card popup (when showCard) */}
                {showCard&&sel&&(
                  <AgentProfileCard
                    id={sel} status={agentStatuses[sel]??'idle'}
                    task={tasks.find(t=>t.assigned_to===sel&&(t.status==='in_progress'||t.status==='pending'))}
                    lastMsg={lastMsgs[sel]}
                    onClose={()=>setShowCard(false)}
                  />
                )}
                {room==='command'&&<RoomCommand sel={sel} onSel={handleSel} statuses={agentStatuses} speeches={speechBubbles}/>}
                {room==='meeting'&&<RoomMeeting sel={sel} onSel={handleSel} statuses={agentStatuses} speeches={speechBubbles}/>}
                {room==='office' &&<RoomOffice  sel={sel} onSel={handleSel} statuses={agentStatuses} speeches={speechBubbles}/>}
              </div>

              {/* Ticker */}
              <div className="flex items-center px-3 gap-2 shrink-0 border-t border-white/5" style={{height:24,background:'rgba(4,4,14,0.97)'}}>
                <span className="text-[9px] font-mono text-cyan-400 animate-pulse shrink-0">▶</span>
                <span key={`${room}-${tick}`} className="text-[9px] font-mono text-purple-300/35 truncate" style={{animation:'tickIn 0.35s ease-out'}}>{tickers[room][tick]}</span>
                {sel&&<button onClick={()=>setShowCard(v=>!v)} className="ml-auto text-[8px] text-purple-400/50 hover:text-purple-300 shrink-0 border border-purple-500/20 px-1.5 py-0.5 rounded hover:border-purple-400/40 transition-all">{showCard?'✕':'👤 โปรไฟล์'}</button>}
              </div>

              {/* Chat */}
              {sel&&CHAR[sel]&&(
                <div className="border-t border-purple-500/15 flex flex-col shrink-0" style={{animation:'panelIn 0.2s ease-out',background:'#08081c',maxHeight:230}}>
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 shrink-0">
                    <div className="w-5 h-5 rounded-lg overflow-hidden shrink-0">
                      <Image src={`/characters/${sel.toLowerCase()}.png`} alt={sel} width={20} height={20} className="w-full h-full object-cover"/>
                    </div>
                    <span className="text-purple-200 text-xs font-bold">{sel}</span>
                    <span className="text-white/25 text-[10px]">{CHAR[sel].th}</span>
                    <span className="text-white/12 text-[9px]">· {CHAR[sel].role}</span>
                    {agentStatuses[sel]==='working'&&<span className="text-[9px] text-emerald-400 bg-emerald-900/30 px-1.5 py-0.5 rounded-full">💻 งาน</span>}
                    {agentStatuses[sel]==='busy'&&<span className="text-[9px] text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded-full">⚡ รอ</span>}
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[8px] text-emerald-400 font-mono">● online</span>
                      <button onClick={()=>{setSel(null);setMessages([])}} className="text-white/20 hover:text-white/60 text-xs">✕</button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2" style={{minHeight:60,maxHeight:130}}>
                    {messages.length===0&&!agentTyping&&<p className="text-[10px] text-white/20 text-center py-3">เริ่มสนทนากับ {sel}...</p>}
                    {messages.map(m=>(
                      <div key={m.id} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
                        {m.role==='agent'&&<div className="w-5 h-5 rounded-lg overflow-hidden mr-1.5 shrink-0 mt-0.5"><Image src={`/characters/${sel.toLowerCase()}.png`} alt={sel} width={20} height={20} className="w-full h-full object-cover"/></div>}
                        <div className={`max-w-[80%] rounded-xl px-3 py-1.5 text-[11px] leading-relaxed ${m.role==='user'?'bg-purple-600/40 text-purple-100 rounded-tr-sm':'bg-white/7 text-white/80 rounded-tl-sm border border-white/7'}`}>{m.content}</div>
                        {m.role==='user'&&<div className="w-5 h-5 rounded-lg ml-1.5 shrink-0 mt-0.5 bg-purple-600 flex items-center justify-center"><span className="text-[7px] text-white font-black">YOU</span></div>}
                      </div>
                    ))}
                    {agentTyping&&<div className="flex justify-start"><div className="w-5 h-5 rounded-lg overflow-hidden mr-1.5 shrink-0 mt-0.5"><Image src={`/characters/${sel.toLowerCase()}.png`} alt={sel} width={20} height={20} className="w-full h-full object-cover"/></div><div className="bg-white/7 border border-white/7 rounded-xl rounded-tl-sm px-3 py-1.5 flex gap-1 items-center">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 rounded-full bg-white/40" style={{animation:`typingPulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}</div></div>}
                    <div ref={msgEndRef}/>
                  </div>
                  <div className="flex gap-2 px-4 py-2 border-t border-white/5 shrink-0">
                    <input value={dir} onChange={e=>setDir(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendChat()}
                      placeholder={`พิมพ์ถึง ${sel}...`} autoFocus disabled={sending}
                      className="flex-1 bg-white/5 border border-purple-500/20 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/15 focus:outline-none focus:border-purple-400/40 disabled:opacity-50"/>
                    <button onClick={sendChat} disabled={!dir.trim()||sending} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white text-[10px] font-bold px-4 py-1.5 rounded-lg shrink-0 transition-all">{sending?'◈':'ส่ง'}</button>
                  </div>
                </div>
              )}

              <SystemConsole logs={liveLogs}/>
            </div>

            {/* RIGHT: Actions */}
            <div className="w-52 shrink-0 border-l border-white/6 flex flex-col" style={{background:'#06060f'}}>
              <div className="grid grid-cols-2 gap-1.5 p-2 border-b border-white/6">
                {actionBtns.map(b=>(
                  <button key={b.id} onClick={()=>setPanel(p=>p===b.id?null:b.id)}
                    className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border text-[9px] font-bold tracking-wider transition-all ${b.cls} ${panel===b.id?'bg-white/10':''}`}>
                    <span className="text-base">{b.icon}</span><span>{b.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex-1 p-3 overflow-y-auto text-xs">
                {!panel&&<div className="text-center py-8 text-white/15 text-[10px]"><div className="text-2xl mb-2">🎮</div><p>กดปุ่มด้านบน</p></div>}
                {panel==='broadcast'&&<PanelBroadcast room={room} onClose={()=>setPanel(null)}/>}
                {panel==='tasks'    &&<PanelTasks room={room} tasks={tasks}/>}
                {panel==='report'   &&<PanelReport tasks={tasks} logs={liveLogs}/>}
                {panel==='alert'    &&<PanelAlert room={room} onClose={()=>setPanel(null)}/>}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-6 gap-4">
            {ROOMS.map(r=>(
              <button key={r.id} onClick={()=>switchRoom(r.id)} className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border border-purple-500/20 hover:border-purple-400/50 hover:bg-purple-500/10 transition-all group">
                <span className="text-2xl">{r.icon}</span>
                <span className="text-[10px] font-bold text-white/50 group-hover:text-purple-300">{r.th}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
