'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * Sprite Sheet Inspector
 * เปิดที่ /sprite-inspector
 * ใช้วัด frame ขนาด และทดสอบ animation ก่อนใส่โค้ดจริง
 */

export default function SpriteInspector() {
  const [imgSrc,       setImgSrc]       = useState<string | null>(null)
  const [imgSize,      setImgSize]      = useState({ w: 0, h: 0 })
  const [cols,         setCols]         = useState(3)
  const [rows,         setRows]         = useState(4)
  const [offsetY,      setOffsetY]      = useState(0)
  const [selRow,       setSelRow]       = useState(0)
  const [animating,    setAnimating]    = useState(false)
  const [fps,          setFps]          = useState(8)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [scale,        setScale]        = useState(3)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef    = useRef<HTMLImageElement | null>(null)
  const animRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  const frameW = imgSize.w > 0 ? Math.floor(imgSize.w / cols) : 0
  const frameH = imgSize.h > 0 ? Math.floor((imgSize.h - offsetY) / rows) : 0

  // Load dropped image
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setImgSrc(url)
      setImgSize({ w: img.width, h: img.height })
      imgRef.current = img
    }
    img.src = url
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setImgSrc(url)
      setImgSize({ w: img.width, h: img.height })
      imgRef.current = img
    }
    img.src = url
  }

  // Draw current frame on canvas
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !imgRef.current || frameW <= 0 || frameH <= 0) return

    const sx = currentFrame * frameW
    const sy = offsetY + selRow * frameH
    const dw = frameW * scale
    const dh = frameH * scale

    ctx.canvas.width  = dw
    ctx.canvas.height = dh
    ctx.clearRect(0, 0, dw, dh)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(imgRef.current, sx, sy, frameW, frameH, 0, 0, dw, dh)
  }, [currentFrame, selRow, frameW, frameH, offsetY, scale])

  // Animation loop
  useEffect(() => {
    if (animRef.current) clearInterval(animRef.current)
    if (!animating || cols <= 0) { setCurrentFrame(0); return }
    animRef.current = setInterval(() => {
      setCurrentFrame(f => (f + 1) % cols)
    }, 1000 / fps)
    return () => { if (animRef.current) clearInterval(animRef.current) }
  }, [animating, fps, cols])

  const cfgOutput = {
    frameW,
    frameH,
    sheetOffsetY: offsetY,
    animations: {
      idle: { row: 0, frames: cols, fps: 4  },
      walk: { row: 1, frames: cols, fps: fps },
      sit:  { row: 0, frames: 1,   fps: 1  },
    },
  }

  return (
    <div style={{ background: '#0d1117', minHeight: '100vh', color: '#e6edf3', fontFamily: 'monospace', padding: 24 }}>
      <h1 style={{ fontSize: 18, fontWeight: 900, marginBottom: 4, color: '#60a5fa' }}>
        🔍 Sprite Sheet Inspector
      </h1>
      <p style={{ fontSize: 11, color: '#4b5563', marginBottom: 20 }}>
        วัด frame size และทดสอบ animation ก่อนใส่โค้ดจริง
      </p>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>

        {/* LEFT: Upload + sheet preview */}
        <div style={{ flex: 1, minWidth: 300 }}>

          {/* Drop zone */}
          <div
            onDrop={handleDrop} onDragOver={e => e.preventDefault()}
            style={{
              border: '2px dashed #30363d', borderRadius: 8, padding: 20,
              textAlign: 'center', marginBottom: 16, cursor: 'pointer',
              background: '#161b22',
            }}>
            <input type="file" accept="image/*" onChange={handleFile}
              style={{ display: 'none' }} id="file-inp" />
            <label htmlFor="file-inp" style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
              <div style={{ fontSize: 12, color: '#4b5563' }}>ลาก sprite sheet มาวาง หรือ คลิกเลือกไฟล์</div>
            </label>
          </div>

          {/* Sheet preview with grid overlay */}
          {imgSrc && (
            <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgSrc} alt="sheet"
                style={{ maxWidth: '100%', maxHeight: 500, imageRendering: 'pixelated', display: 'block' }} />

              {/* Offset mask */}
              {offsetY > 0 && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: `${(offsetY / imgSize.h) * 100}%`,
                  background: 'rgba(255,0,0,0.2)',
                  border: '2px solid rgba(255,0,0,0.5)',
                  pointerEvents: 'none',
                }}>
                  <span style={{ fontSize: 9, color: '#ff4444', padding: 2 }}>SKIP ({offsetY}px)</span>
                </div>
              )}

              {/* Grid overlay */}
              {frameW > 0 && frameH > 0 && Array.from({ length: rows }).map((_, r) =>
                Array.from({ length: cols }).map((_, c) => (
                  <div key={`${r}-${c}`}
                    onClick={() => { setSelRow(r); setCurrentFrame(c); setAnimating(false) }}
                    style={{
                      position: 'absolute',
                      left:   `${(c * frameW / imgSize.w) * 100}%`,
                      top:    `${((offsetY + r * frameH) / imgSize.h) * 100}%`,
                      width:  `${(frameW / imgSize.w) * 100}%`,
                      height: `${(frameH / imgSize.h) * 100}%`,
                      border: selRow === r
                        ? '1.5px solid #22c55e'
                        : '1px solid rgba(0,229,255,0.25)',
                      background: selRow === r && currentFrame === c
                        ? 'rgba(34,197,94,0.15)'
                        : 'transparent',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}>
                    {r === 0 && c === 0 && (
                      <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.4)', padding: 1 }}>
                        {frameW}×{frameH}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Controls + Preview */}
        <div style={{ width: 280 }}>

          {/* Controls */}
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', marginBottom: 12 }}>⚙️ CONFIG</div>

            {[
              { label: 'Columns (กี่ frame ต่อแถว)', val: cols, set: setCols, min: 1, max: 20 },
              { label: 'Rows (กี่แถว)',               val: rows, set: setRows, min: 1, max: 20 },
              { label: 'Skip top (portrait px)',       val: offsetY, set: setOffsetY, min: 0, max: 2000 },
              { label: 'Preview Scale',                val: scale,   set: setScale,   min: 1, max: 6 },
              { label: 'FPS (Animation speed)',        val: fps,     set: setFps,     min: 1, max: 30 },
            ].map(ctrl => (
              <div key={ctrl.label} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: '#8b949e', marginBottom: 3 }}>{ctrl.label}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="range" min={ctrl.min} max={ctrl.max} value={ctrl.val}
                    onChange={e => ctrl.set(Number(e.target.value))}
                    style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#f0f6fc', width: 32, textAlign: 'right' }}>
                    {ctrl.val}
                  </span>
                </div>
              </div>
            ))}

            {imgSize.w > 0 && (
              <div style={{ marginTop: 12, padding: 10, background: '#0d1117', borderRadius: 6 }}>
                <div style={{ fontSize: 9, color: '#4b5563' }}>Sheet: {imgSize.w}×{imgSize.h}px</div>
                <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>
                  Frame: {frameW}×{frameH}px
                </div>
                <div style={{ fontSize: 9, color: '#4b5563' }}>
                  Selected row: {selRow} | frame: {currentFrame}
                </div>
              </div>
            )}
          </div>

          {/* Animation preview */}
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', marginBottom: 12 }}>🎬 PREVIEW</div>

            {/* Row selector */}
            {rows > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                {Array.from({ length: rows }).map((_, r) => (
                  <button key={r} onClick={() => { setSelRow(r); setCurrentFrame(0) }}
                    style={{
                      padding: '3px 8px', fontSize: 9, fontWeight: 700, borderRadius: 4,
                      background: selRow === r ? '#22c55e' : '#21262d',
                      color: selRow === r ? '#0d1117' : '#8b949e',
                      border: 'none', cursor: 'pointer',
                    }}>
                    Row {r}
                  </button>
                ))}
              </div>
            )}

            {/* Canvas preview */}
            <div style={{
              background: '#5d7a7a', borderRadius: 6, padding: 8,
              display: 'flex', justifyContent: 'center', marginBottom: 10,
              minHeight: 80,
            }}>
              <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />
            </div>

            <button onClick={() => setAnimating(a => !a)}
              style={{
                width: '100%', padding: '8px', borderRadius: 6,
                background: animating ? '#dc2626' : '#22c55e',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 700,
              }}>
              {animating ? '⏹ STOP' : '▶ PLAY ANIMATION'}
            </button>
          </div>

          {/* Output config */}
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', marginBottom: 8 }}>📋 COPY ใส่ CHAR_CONFIGS</div>
            <pre style={{
              fontSize: 9, color: '#22c55e', background: '#0d1117',
              padding: 10, borderRadius: 6, overflow: 'auto',
              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
              {JSON.stringify(cfgOutput, null, 2)}
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(JSON.stringify(cfgOutput, null, 2))}
              style={{
                marginTop: 8, width: '100%', padding: '6px', borderRadius: 6,
                background: '#1f6feb', color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 10, fontWeight: 700,
              }}>
              📋 COPY CONFIG
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
