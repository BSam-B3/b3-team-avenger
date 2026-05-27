'use client'

import { useEffect, useState } from 'react'

function PixelChar({ color, bobDelay = 0 }: { color: string; bobDelay?: number }) {
  return (
    <div className="flex flex-col items-center" style={{ imageRendering: 'pixelated' }}>
      <div style={{
        width: 8, height: 8,
        background: '#f4c38a',
        border: '1px solid #c9915c',
        borderRadius: '1px',
        animation: `bob 1.8s ease-in-out ${bobDelay}s infinite`,
      }} />
      <div style={{ width: 10, height: 8, background: color, borderRadius: '1px' }} />
      <div style={{ width: 6, height: 4, background: '#222' }} />
    </div>
  )
}

function Monitor({ screenColor, pulse }: { screenColor: string; pulse?: boolean }) {
  return (
    <div className="flex flex-col items-center" style={{ imageRendering: 'pixelated' }}>
      <div style={{
        width: 22, height: 15,
        background: screenColor,
        border: '2px solid #2a2a4a',
        borderRadius: '1px',
        boxShadow: pulse ? `0 0 10px ${screenColor}88` : 'none',
        animation: pulse ? 'screenPulse 2.4s ease-in-out infinite' : 'none',
      }} />
      <div style={{ width: 5, height: 4, background: '#2a2a4a' }} />
      <div style={{ width: 14, height: 2, background: '#333' }} />
    </div>
  )
}

function Workstation({ charColor, screenColor, pulse, delay = 0 }: {
  charColor: string; screenColor: string; pulse?: boolean; delay?: number
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Monitor screenColor={screenColor} pulse={pulse} />
      <div style={{ width: 34, height: 6, background: '#3d2b1a', borderBottom: '2px solid #1e1208', borderRadius: '1px' }} />
      <PixelChar color={charColor} bobDelay={delay} />
    </div>
  )
}

const STATIONS = [
  { charColor: '#7c3aed', screenColor: '#fde68a44', pulse: true,  delay: 0.0 },
  { charColor: '#ec4899', screenColor: '#a78bfa66', pulse: true,  delay: 0.3 },
  { charColor: '#1d4ed8', screenColor: '#6ee7b744', pulse: false, delay: 0.6 },
  { charColor: '#059669', screenColor: '#34d39966', pulse: true,  delay: 0.9 },
  { charColor: '#b45309', screenColor: '#fbbf2444', pulse: false, delay: 1.2 },
  { charColor: '#7c3aed', screenColor: '#93c5fd44', pulse: true,  delay: 1.5 },
  { charColor: '#db2777', screenColor: '#f9a8d444', pulse: false, delay: 0.4 },
]

const TICKER = [
  '◈  B3 Team Avenger — AI Command Center online',
  '◈  Janie AI ready — awaiting directive from The Bridge',
  '◈  Realtime sync active — Supabase connected',
  '◈  All 13 agents standing by',
  '◈  9CJ Corp · PandVHappiness Co., Ltd.',
]

export default function PixelOfficeRoom() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(i => (i + 1) % TICKER.length), 3200)
    return () => clearInterval(t)
  }, [])

  return (
    <>
      <style>{`
        @keyframes bob {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-3px); }
        }
        @keyframes screenPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
        @keyframes wallLight {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #818cf8; }
          50%       { opacity: 0.3; box-shadow: 0 0 3px #818cf8; }
        }
        @keyframes tickerSlide {
          from { opacity: 0; transform: translateX(8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="w-full rounded-xl overflow-hidden border border-purple-500/30 relative select-none"
        style={{ height: 172, background: '#08081a' }}>

        {/* CRT scanlines */}
        <div className="absolute inset-0 pointer-events-none z-20" style={{
          background: 'repeating-linear-gradient(transparent 0px, transparent 3px, rgba(88,28,235,0.04) 3px, rgba(88,28,235,0.04) 4px)'
        }} />

        {/* Back wall */}
        <div className="absolute inset-x-0 top-0" style={{
          height: 100,
          background: 'linear-gradient(180deg, #0c0c38 0%, #09092a 100%)',
          borderBottom: '3px solid #1a1a4a'
        }}>
          {/* Wall lights */}
          {[60, 160, 260, 370, 480, 580].map((x, i) => (
            <div key={x} style={{
              position: 'absolute', left: x, top: 14,
              width: 5, height: 5, borderRadius: '50%',
              background: '#818cf8',
              animation: `wallLight ${1.5 + i * 0.3}s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
          {/* Command sign */}
          <div className="absolute left-1/2 -translate-x-1/2 top-3 flex items-center gap-1.5">
            <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#a78bfa', letterSpacing: '0.2em', opacity: 0.8 }}>
              ■ B3 COMMAND ROOM ■
            </span>
          </div>
        </div>

        {/* Floor */}
        <div className="absolute inset-x-0 bottom-7" style={{
          height: 72,
          background: '#130e1e',
          borderTop: '2px solid #1e1530'
        }}>
          {Array.from({ length: 22 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute', left: i * 30, top: 0, bottom: 0, width: 1,
              background: 'rgba(120,60,180,0.12)'
            }} />
          ))}
        </div>

        {/* Workstations */}
        <div className="absolute inset-x-0 flex items-end justify-around px-4"
          style={{ bottom: 32 }}>
          {STATIONS.map((s, i) => (
            <Workstation key={i} {...s} />
          ))}
        </div>

        {/* Ticker bar */}
        <div className="absolute bottom-0 inset-x-0 flex items-center px-3 border-t border-purple-500/20"
          style={{ height: 28, background: 'rgba(8,8,26,0.9)' }}>
          <span className="text-[9px] font-mono text-cyan-400 animate-pulse mr-2">▶</span>
          <span key={tick} className="text-[9px] font-mono text-purple-300/60"
            style={{ animation: 'tickerSlide 0.4s ease-out' }}>
            {TICKER[tick]}
          </span>
        </div>
      </div>
    </>
  )
}
