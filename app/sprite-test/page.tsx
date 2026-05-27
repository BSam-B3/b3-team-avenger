'use client'

/**
 * /sprite-test — ทดสอบ sprite animation แบบ interactive
 * เปิดที่ http://localhost:3000/sprite-test
 */

import { useState } from 'react'
import SpriteCharacter, { type Direction, type WalkState } from '../dashboard/SpriteCharacter'

const DIRECTIONS: Direction[]  = ['down', 'left', 'right', 'up']
const STATES: WalkState[]      = ['idle', 'walk', 'sit']

export default function SpriteTest() {
  const [state, setState]       = useState<WalkState>('walk')
  const [dir,   setDir]         = useState<Direction>('down')
  const [scale, setScale]       = useState(3)
  const [id,    setId]          = useState('Nara')

  return (
    <div style={{
      background: '#0d1117', minHeight: '100vh', color: '#e6edf3',
      fontFamily: 'monospace', padding: 32, display: 'flex', gap: 32,
    }}>

      {/* LEFT — controls */}
      <div style={{ width: 240 }}>
        <h1 style={{ fontSize: 16, fontWeight: 900, color: '#60a5fa', marginBottom: 20 }}>
          🎮 Sprite Test
        </h1>

        {/* Character ID */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>Character ID</div>
          <input
            value={id}
            onChange={e => setId(e.target.value)}
            style={{
              width: '100%', padding: '6px 8px', background: '#161b22',
              border: '1px solid #30363d', borderRadius: 6, color: '#f0f6fc',
              fontSize: 12, fontFamily: 'monospace',
            }}
          />
          <div style={{ fontSize: 9, color: '#4b5563', marginTop: 2 }}>
            ต้องตรงกับชื่อไฟล์ใน public/characters/sheets/
          </div>
        </div>

        {/* Walk State */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 6 }}>State</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {STATES.map(s => (
              <button key={s} onClick={() => setState(s)} style={{
                flex: 1, padding: '6px 4px', fontSize: 10, fontWeight: 700,
                borderRadius: 6, border: 'none', cursor: 'pointer',
                background: state === s ? '#22c55e' : '#21262d',
                color: state === s ? '#0d1117' : '#8b949e',
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Direction */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 6 }}>Direction</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {DIRECTIONS.map(d => (
              <button key={d} onClick={() => setDir(d)} style={{
                padding: '6px', fontSize: 10, fontWeight: 700,
                borderRadius: 6, border: 'none', cursor: 'pointer',
                background: dir === d ? '#3b82f6' : '#21262d',
                color: dir === d ? '#fff' : '#8b949e',
              }}>{d === 'up' ? '↑' : d === 'down' ? '↓' : d === 'left' ? '←' : '→'} {d}</button>
            ))}
          </div>
        </div>

        {/* Scale */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>Scale × {scale}</div>
          <input type="range" min={1} max={6} value={scale}
            onChange={e => setScale(Number(e.target.value))}
            style={{ width: '100%' }} />
        </div>

        <div style={{
          padding: 10, background: '#161b22', borderRadius: 6,
          fontSize: 9, color: '#4b5563', lineHeight: 1.6,
        }}>
          <div style={{ color: '#22c55e', fontWeight: 700, marginBottom: 4 }}>ถ้า sprite ยังไม่ถูก:</div>
          <div>1. เปิด /sprite-inspector</div>
          <div>2. ลาก nara.png มาวาง</div>
          <div>3. ตั้ง cols/rows/offsetY</div>
          <div>4. copy config ที่ได้</div>
          <div>5. ใส่ใน CHAR_CONFIGS ใน SpriteCharacter.tsx</div>
        </div>
      </div>

      {/* RIGHT — preview */}
      <div style={{ flex: 1 }}>

        {/* Large preview */}
        <div style={{
          background: '#5d7a7a', borderRadius: 12, padding: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24, minHeight: 300,
          position: 'relative',
        }}>
          {/* grid background */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 12,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }} />
          <SpriteCharacter
            id={id} direction={dir} state={state} scale={scale} isWorking={false}
          />
        </div>

        {/* All 4 states side by side */}
        <div style={{ marginBottom: 12, fontSize: 10, color: '#8b949e' }}>
          Preview ทุก state — scale×2
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {STATES.map(s => (
            <div key={s} style={{ textAlign: 'center' }}>
              <div style={{
                background: '#1c2128', borderRadius: 8, padding: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 6, minWidth: 80, minHeight: 80,
              }}>
                <SpriteCharacter id={id} direction={dir} state={s} scale={2} isWorking={s === 'walk'} />
              </div>
              <div style={{ fontSize: 9, color: s === state ? '#22c55e' : '#4b5563', fontWeight: 700 }}>
                {s}
              </div>
            </div>
          ))}
        </div>

        {/* All 4 directions side by side (walk state) */}
        <div style={{ marginTop: 24, marginBottom: 12, fontSize: 10, color: '#8b949e' }}>
          Preview ทุกทิศ — walk state — scale×2
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {DIRECTIONS.map(d => (
            <div key={d} style={{ textAlign: 'center' }}>
              <div style={{
                background: '#1c2128', borderRadius: 8, padding: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 6, minWidth: 80, minHeight: 80,
              }}>
                <SpriteCharacter id={id} direction={d} state="walk" scale={2} isWorking={false} />
              </div>
              <div style={{ fontSize: 9, color: '#4b5563' }}>
                {d === 'up' ? '↑' : d === 'down' ? '↓' : d === 'left' ? '←' : '→'} {d}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
