'use client'

/**
 * SpriteCharacter — รองรับ 4 format ตามลำดับ priority:
 *
 * 0. FRAME_SEQ  /characters/sheets/{Name}/{frame}.png  ← ใหม่! (highest priority)
 *              — individual frame files, ตัดแยกเป็น PNG แต่ละ frame
 *              — กำหนด config ใน FRAME_SEQ_CHARS
 *              — รองรับ frames ขนาดต่างกัน, flipX สำหรับ mirror
 *
 * 1. STRIP      /characters/sprites/{name}/{anim}.png
 *              — ตัดทีละ animation เป็น strip แนวนอน (ง่ายสุด)
 *              — 3 frames × 91px wide, 92px tall
 *              — walk_right ไม่ต้องมีไฟล์ = auto mirror walk_left
 *
 * 2. SHEET      /characters/sheets/{name}.png
 *              — sprite sheet เต็ม (CHAR_CONFIGS สำหรับ custom layout)
 *
 * 3. LPC        /characters/sheets/lpc/{name}.png
 *              — Universal LPC format
 *
 * 4. PORTRAIT   /characters/{name}.png
 *              — fallback รูปภาพธรรมดา
 */

import { useState, useEffect } from 'react'
import Image from 'next/image'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Direction = 'down' | 'left' | 'right' | 'up'
export type WalkState = 'idle' | 'walk' | 'sit'

// ─── FRAME_SEQ config (individual PNG files per frame) ───────────────────────

interface FrameSeqAnim {
  fps:     number
  frames:  string[]   // filenames ภายใน base folder
  flipX?:  boolean
}

interface FrameSeqDef {
  base:      string   // URL prefix เช่น /characters/sheets/nara
  displayW:  number   // กว้างกล่องแสดงผล (px ก่อน zoom)
  displayH:  number   // สูงกล่องแสดงผล (px ก่อน zoom)
  animations: Record<string, FrameSeqAnim>
}

/**
 * ตัวละครที่ใช้ individual frame files
 * key = ชื่อ character ตรงตัวอักษรใหญ่เล็ก (ตรงกับ prop id)
 * frames ที่มี space ในชื่อจะถูก encodeURIComponent ตอน render
 */
const FRAME_SEQ_CHARS: Partial<Record<string, FrameSeqDef>> = {
  // ── Janie ──────────────────────────────────────────────────────────────────
  // Files: idle.png, Work.png, BUp.png, Down Walk1.png, Down Walk2.png,
  //        Up Walk1.png, Up Walk2.png, LR1.png, LR2 Walk.png
  Janie: {
    base:     '/characters/sheets/Janie',
    displayW: 70,
    displayH: 120,
    animations: {
      idle:       { fps: 1, frames: ['idle.png'] },
      sit:        { fps: 1, frames: ['Work.png'] },
      walk_down:  { fps: 6, frames: ['Down Walk1.png', 'Down Walk2.png'] },
      walk_up:    { fps: 6, frames: ['Up Walk1.png', 'Up Walk2.png'] },
      walk_left:  { fps: 6, frames: ['LR1.png', 'LR2 Walk.png'] },
      walk_right: { fps: 6, frames: ['LR1.png', 'LR2 Walk.png'], flipX: true },
    },
  },

  // ── Joe ────────────────────────────────────────────────────────────────────
  // Files: Idle1.png, Idle2.png, BUp Walk.png, Down Wlak.png (typo),
  //        L2 Walk.png, R2 Walk.png, LR1.png, UP Walk2.png, Up Walk1.png
  // No Work.png → use BUp Walk.png for sit
  Joe: {
    base:     '/characters/sheets/Joe',
    displayW: 70,
    displayH: 120,
    animations: {
      idle:       { fps: 2, frames: ['Idle1.png', 'Idle2.png'] },
      sit:        { fps: 1, frames: ['BUp Walk.png'] },
      walk_down:  { fps: 4, frames: ['Down Wlak.png'] },
      walk_up:    { fps: 6, frames: ['Up Walk1.png', 'UP Walk2.png'] },
      walk_left:  { fps: 4, frames: ['L2 Walk.png'] },
      walk_right: { fps: 4, frames: ['R2 Walk.png'] },
    },
  },

  // ── Enjoy ──────────────────────────────────────────────────────────────────
  // Files: Idle.png, Work.png, BUp Walk2.png, Down Walk1.png, Down Walk2.png,
  //        L Walk1.png, LR.png, R Walk1.png, Up Walk.png
  Enjoy: {
    base:     '/characters/sheets/Enjoy',
    displayW: 70,
    displayH: 120,
    animations: {
      idle:       { fps: 1, frames: ['Idle.png'] },
      sit:        { fps: 1, frames: ['Work.png'] },
      walk_down:  { fps: 6, frames: ['Down Walk1.png', 'Down Walk2.png'] },
      walk_up:    { fps: 4, frames: ['Up Walk.png'] },
      walk_left:  { fps: 4, frames: ['L Walk1.png'] },
      walk_right: { fps: 4, frames: ['R Walk1.png'] },
    },
  },

  // ── Metha ──────────────────────────────────────────────────────────────────
  // Files: Idle.png, Work.png, BUp Walk.png, Down Walk1.png, Down Walk2.png,
  //        LR1.png, LR2 Walk.png, Up Walk1.png
  Metha: {
    base:     '/characters/sheets/Metha',
    displayW: 70,
    displayH: 120,
    animations: {
      idle:       { fps: 1, frames: ['Idle.png'] },
      sit:        { fps: 1, frames: ['Work.png'] },
      walk_down:  { fps: 6, frames: ['Down Walk1.png', 'Down Walk2.png'] },
      walk_up:    { fps: 4, frames: ['Up Walk1.png'] },
      walk_left:  { fps: 6, frames: ['LR1.png', 'LR2 Walk.png'] },
      walk_right: { fps: 6, frames: ['LR1.png', 'LR2 Walk.png'], flipX: true },
    },
  },

  // ── Karn ───────────────────────────────────────────────────────────────────
  // Files: Idle1.png, Idle2.png, Work.png, BUp Walk.png,
  //        Down Wlak1.png (typo), Down Wlak2.png (typo),
  //        LR Walk2.png, LR1.png, Up Walk1.png, Up Walk2.png
  Karn: {
    base:     '/characters/sheets/Karn',
    displayW: 70,
    displayH: 120,
    animations: {
      idle:       { fps: 2, frames: ['Idle1.png', 'Idle2.png'] },
      sit:        { fps: 1, frames: ['Work.png'] },
      walk_down:  { fps: 6, frames: ['Down Wlak1.png', 'Down Wlak2.png'] },
      walk_up:    { fps: 6, frames: ['Up Walk1.png', 'Up Walk2.png'] },
      walk_left:  { fps: 6, frames: ['LR1.png', 'LR Walk2.png'] },
      walk_right: { fps: 6, frames: ['LR1.png', 'LR Walk2.png'], flipX: true },
    },
  },

  // ── kitti ──────────────────────────────────────────────────────────────────
  // Files: Idle.png, Down Walk1.png, Down Walk2.png, LR1.png, LR2 Walk.png,
  //        Up Walk1.png, Up Walk2.png
  // No Work.png → use Up Walk1.png for sit; folder is lowercase 'kitti'
  kitti: {
    base:     '/characters/sheets/kitti',
    displayW: 70,
    displayH: 120,
    animations: {
      idle:       { fps: 1, frames: ['Idle.png'] },
      sit:        { fps: 1, frames: ['Up Walk1.png'] },
      walk_down:  { fps: 6, frames: ['Down Walk1.png', 'Down Walk2.png'] },
      walk_up:    { fps: 6, frames: ['Up Walk1.png', 'Up Walk2.png'] },
      walk_left:  { fps: 6, frames: ['LR1.png', 'LR2 Walk.png'] },
      walk_right: { fps: 6, frames: ['LR1.png', 'LR2 Walk.png'], flipX: true },
    },
  },
  // Alias — OfficeMap uses 'Kitti' (capital K) as agent id
  Kitti: {
    base:     '/characters/sheets/kitti',
    displayW: 70,
    displayH: 120,
    animations: {
      idle:       { fps: 1, frames: ['Idle.png'] },
      sit:        { fps: 1, frames: ['Up Walk1.png'] },
      walk_down:  { fps: 6, frames: ['Down Walk1.png', 'Down Walk2.png'] },
      walk_up:    { fps: 6, frames: ['Up Walk1.png', 'Up Walk2.png'] },
      walk_left:  { fps: 6, frames: ['LR1.png', 'LR2 Walk.png'] },
      walk_right: { fps: 6, frames: ['LR1.png', 'LR2 Walk.png'], flipX: true },
    },
  },

  // ── Nara ───────────────────────────────────────────────────────────────────
  // Files: idle Front.png, BUp Walk.png, Down Walk1.png, Down Walk2.png,
  //        Down Walk3.png, L Walk1.png, LR1.png, R Walk1.png,
  //        Up Walk1.png, Up Walk2.png, Up Walk3.png
  // folder is lowercase 'nara'
  Nara: {
    base:     '/characters/sheets/nara',
    displayW: 70,
    displayH: 120,
    animations: {
      idle:       { fps: 1, frames: ['idle Front.png'] },
      sit:        { fps: 1, frames: ['BUp Walk.png'] },
      walk_down:  { fps: 8, frames: ['Down Walk1.png', 'Down Walk2.png', 'Down Walk3.png'] },
      walk_up:    { fps: 8, frames: ['Up Walk1.png', 'Up Walk2.png', 'Up Walk3.png'] },
      walk_left:  { fps: 4, frames: ['L Walk1.png'] },
      walk_right: { fps: 4, frames: ['R Walk1.png'] },
    },
  },

  // ── Pim ────────────────────────────────────────────────────────────────────
  // Files: Idle.png, Idle2.png, Work.png, BUp Walk.png,
  //        Down Walk1.png, Down Walk2.png, L Walk.png, R Walk.png,
  //        Up Walk1.png, Up Walk2.png
  Pim: {
    base:     '/characters/sheets/Pim',
    displayW: 70,
    displayH: 120,
    animations: {
      idle:       { fps: 2, frames: ['Idle.png', 'Idle2.png'] },
      sit:        { fps: 1, frames: ['Work.png'] },
      walk_down:  { fps: 6, frames: ['Down Walk1.png', 'Down Walk2.png'] },
      walk_up:    { fps: 6, frames: ['Up Walk1.png', 'Up Walk2.png'] },
      walk_left:  { fps: 4, frames: ['L Walk.png'] },
      walk_right: { fps: 4, frames: ['R Walk.png'] },
    },
  },

  // ── Win ────────────────────────────────────────────────────────────────────
  // Files: Idle1.png, Idle2.png, Work.png, BUp Walk.png,
  //        Down Walk1.png, Down Walk2.png, LR1.png, LR2 Walk.png, UpWalk1.png
  Win: {
    base:     '/characters/sheets/Win',
    displayW: 70,
    displayH: 120,
    animations: {
      idle:       { fps: 2, frames: ['Idle1.png', 'Idle2.png'] },
      sit:        { fps: 1, frames: ['Work.png'] },
      walk_down:  { fps: 6, frames: ['Down Walk1.png', 'Down Walk2.png'] },
      walk_up:    { fps: 4, frames: ['UpWalk1.png'] },
      walk_left:  { fps: 6, frames: ['LR1.png', 'LR2 Walk.png'] },
      walk_right: { fps: 6, frames: ['LR1.png', 'LR2 Walk.png'], flipX: true },
    },
  },

  // ── Nam ────────────────────────────────────────────────────────────────────
  // Files: Idel Down Walk1.png (typo), Down Walk2.png, Work.png,
  //        LR1.png, LR2 Walk.png, Up Walk1.png, Up Walk2.png
  // No separate Idle.png → use 'Idel Down Walk1.png' for idle
  Nam: {
    base:     '/characters/sheets/Nam',
    displayW: 70,
    displayH: 120,
    animations: {
      idle:       { fps: 1, frames: ['Idel Down Walk1.png'] },
      sit:        { fps: 1, frames: ['Work.png'] },
      walk_down:  { fps: 6, frames: ['Idel Down Walk1.png', 'Down Walk2.png'] },
      walk_up:    { fps: 6, frames: ['Up Walk1.png', 'Up Walk2.png'] },
      walk_left:  { fps: 6, frames: ['LR1.png', 'LR2 Walk.png'] },
      walk_right: { fps: 6, frames: ['LR1.png', 'LR2 Walk.png'], flipX: true },
    },
  },

  // ── Kom ────────────────────────────────────────────────────────────────────
  // Files: Idle.png, Work.png, BUp Walk.png, Down Walk1.png, Down Walk2.png,
  //        LR1.png, LR2 Walk.png, Up Walk1.png, Up Walk2.png
  Kom: {
    base:     '/characters/sheets/Kom',
    displayW: 70,
    displayH: 120,
    animations: {
      idle:       { fps: 1, frames: ['Idle.png'] },
      sit:        { fps: 1, frames: ['Work.png'] },
      walk_down:  { fps: 6, frames: ['Down Walk1.png', 'Down Walk2.png'] },
      walk_up:    { fps: 6, frames: ['Up Walk1.png', 'Up Walk2.png'] },
      walk_left:  { fps: 6, frames: ['LR1.png', 'LR2 Walk.png'] },
      walk_right: { fps: 6, frames: ['LR1.png', 'LR2 Walk.png'], flipX: true },
    },
  },

  // ── Raps ───────────────────────────────────────────────────────────────────
  // Files: Idle1.png, Work.png, Back.png, Down Walk1.png, Down Walk2.png,
  //        L Walk.png, R Walk.png
  // No BUp Walk → use Back.png for walk_up
  Raps: {
    base:     '/characters/sheets/Raps',
    displayW: 70,
    displayH: 120,
    animations: {
      idle:       { fps: 1, frames: ['Idle1.png'] },
      sit:        { fps: 1, frames: ['Work.png'] },
      walk_down:  { fps: 6, frames: ['Down Walk1.png', 'Down Walk2.png'] },
      walk_up:    { fps: 4, frames: ['Back.png'] },
      walk_left:  { fps: 4, frames: ['L Walk.png'] },
      walk_right: { fps: 4, frames: ['R Walk.png'] },
    },
  },

  // ── Ferin ──────────────────────────────────────────────────────────────────
  // Sprite files not yet generated — using portrait fallback (null → PORTRAIT mode)
  // Place portrait at: public/characters/Ferin.png (ภาพที่ B3 generate เอง)
  // เมื่อมีไฟล์ sprite ให้ uncomment block นี้และใส่ชื่อไฟล์:
  // Ferin: {
  //   base:     '/characters/sheets/Ferin',
  //   displayW: 70, displayH: 120,
  //   animations: {
  //     idle:       { fps: 1, frames: ['Idle.png'] },
  //     sit:        { fps: 1, frames: ['Work.png'] },
  //     walk_down:  { fps: 6, frames: ['Down Walk1.png', 'Down Walk2.png'] },
  //     walk_up:    { fps: 6, frames: ['Up Walk1.png', 'Up Walk2.png'] },
  //     walk_left:  { fps: 6, frames: ['LR1.png', 'LR2 Walk.png'] },
  //     walk_right: { fps: 6, frames: ['LR1.png', 'LR2 Walk.png'], flipX: true },
  //   },
  // },

  // ── Fenton ─────────────────────────────────────────────────────────────────
  // Files: Idle.png, Work.png, BUp Walk.png, Down Walk2.png,
  //        Down Wlak1.png (typo), L2 Walk.png, R2 Walk.png, LR1.png
  Fenton: {
    base:     '/characters/sheets/Fenton',
    displayW: 70,
    displayH: 120,
    animations: {
      idle:       { fps: 1, frames: ['Idle.png'] },
      sit:        { fps: 1, frames: ['Work.png'] },
      walk_down:  { fps: 6, frames: ['Down Wlak1.png', 'Down Walk2.png'] },
      walk_up:    { fps: 4, frames: ['BUp Walk.png'] },
      walk_left:  { fps: 4, frames: ['L2 Walk.png'] },
      walk_right: { fps: 4, frames: ['R2 Walk.png'] },
    },
  },
}

// ─── Strip / Sheet types ──────────────────────────────────────────────────────

interface AnimConfig {
  yStart: number
  frameH: number
  frames: number
  fps:    number
  flipX?: boolean
}

interface SpriteConfig {
  frameW:     number
  animations: Record<string, AnimConfig>
}

// ─── Strip format constants ───────────────────────────────────────────────────
const STRIP_W = 91
const STRIP_H = 92
const STRIP_FRAMES = 3

// ─── LPC sheet config ─────────────────────────────────────────────────────────

const LPC_CONFIG: SpriteConfig = {
  frameW: 64,
  animations: {
    walk_up:    { yStart: 448, frameH: 64, frames: 9, fps: 10 },
    walk_left:  { yStart: 576, frameH: 64, frames: 9, fps: 10 },
    walk_down:  { yStart: 512, frameH: 64, frames: 9, fps: 10 },
    walk_right: { yStart: 640, frameH: 64, frames: 9, fps: 10 },
    idle:       { yStart: 512, frameH: 64, frames: 1, fps: 1  },
    sit:        { yStart: 512, frameH: 64, frames: 1, fps: 1  },
  },
}

// ─── Custom sheet configs (full sheet format) ─────────────────────────────────

const CHAR_CONFIGS: Partial<Record<string, SpriteConfig>> = {}

const DEFAULT_SHEET: SpriteConfig = {
  frameW: STRIP_W,
  animations: {
    idle: { yStart: 0, frameH: STRIP_H, frames: STRIP_FRAMES, fps: 3 },
    walk: { yStart: 0, frameH: STRIP_H, frames: STRIP_FRAMES, fps: 8 },
    sit:  { yStart: 0, frameH: STRIP_H, frames: 1, fps: 1 },
  },
}

// ─── CSS keyframe injection ───────────────────────────────────────────────────

const injectedKeys = new Set<string>()

function injectAnim(key: string, frameW: number, frames: number, yStart: number) {
  if (injectedKeys.has(key) || typeof document === 'undefined') return
  injectedKeys.add(key)
  const totalW = frameW * frames
  const css = `@keyframes ${key} {
    from { background-position: 0px -${yStart}px; }
    to   { background-position: -${totalW}px -${yStart}px; }
  }`
  const el = document.createElement('style')
  el.setAttribute('data-sprite', key)
  el.textContent = css
  document.head.appendChild(el)
}

// ─── Component ────────────────────────────────────────────────────────────────

type Mode = 'loading' | 'strip' | 'sheet' | 'lpc' | 'portrait'

interface Props {
  id:         string
  direction?: Direction
  state?:     WalkState
  scale?:     number
  isWorking?: boolean
  onClick?:   () => void
}

export default function SpriteCharacter({
  id,
  direction = 'down',
  state     = 'idle',
  scale     = 1,
  isWorking = false,
  onClick,
}: Props) {
  const [mode, setMode] = useState<Mode>('loading')
  const [cfg,  setCfg]  = useState<SpriteConfig>(DEFAULT_SHEET)
  const [frameIdx, setFrameIdx] = useState(0)

  const nameLC      = id.toLowerCase()
  const stripDir    = `/characters/sprites/${nameLC}`
  const customSrc   = `/characters/sheets/${nameLC}.png`
  const lpcSrc      = `/characters/sheets/lpc/${nameLC}.png`
  const portraitSrc = `/characters/${nameLC}.png`

  // Determine animation key (shared by frame_seq and sheet/strip modes)
  let animKey: string
  if (state === 'walk') {
    animKey = `walk_${direction}`
  } else {
    animKey = state  // idle | sit
  }

  const seqDef = FRAME_SEQ_CHARS[id]

  // ── File detection (skip for frame_seq chars) ──────────────────────────────
  useEffect(() => {
    if (seqDef) return  // frame_seq chars don't need probe detection

    const tryLoad = (src: string, ok: () => void, fail: () => void) => {
      const img = new window.Image()
      img.onload  = ok
      img.onerror = fail
      img.src     = src
    }

    tryLoad(`${stripDir}/idle.png`,
      () => setMode('strip'),
      () => tryLoad(customSrc,
        () => { setCfg(CHAR_CONFIGS[id] ?? DEFAULT_SHEET); setMode('sheet') },
        () => tryLoad(lpcSrc,
          () => { setCfg(LPC_CONFIG); setMode('lpc') },
          () => setMode('portrait')
        )
      )
    )
  }, [id, seqDef, stripDir, customSrc, lpcSrc])

  // ── Frame cycling for frame_seq mode ──────────────────────────────────────
  useEffect(() => {
    if (!seqDef) { setFrameIdx(0); return }

    const animSeq = seqDef.animations[animKey]
      ?? seqDef.animations['walk_left']
      ?? seqDef.animations['idle']
    if (!animSeq || animSeq.frames.length <= 1) { setFrameIdx(0); return }

    setFrameIdx(0)  // reset กลับ frame แรกเมื่อเปลี่ยน animation
    const timer = setInterval(() => {
      setFrameIdx(i => (i + 1) % animSeq.frames.length)
    }, 1000 / animSeq.fps)
    return () => clearInterval(timer)
  }, [seqDef, animKey])

  // ── FRAME_SEQ render ───────────────────────────────────────────────────────
  if (seqDef) {
    const animSeq = seqDef.animations[animKey]
      ?? seqDef.animations['walk_left']
      ?? seqDef.animations['idle']

    if (!animSeq) return null

    const safeIdx  = frameIdx % animSeq.frames.length
    const fileName = animSeq.frames[safeIdx]
    // encode spaces + special chars แต่ preserve /
    const frameSrc = `${seqDef.base}/${encodeURIComponent(fileName)}`
    const isFlipped = animSeq.flipX === true

    return (
      <div
        onClick={onClick}
        title={id}
        style={{
          width:    seqDef.displayW,
          height:   seqDef.displayH,
          overflow: 'hidden',
          position: 'relative',
          zoom:     scale,
          cursor:   onClick ? 'pointer' : 'default',
          filter:   isWorking ? 'drop-shadow(0 0 6px rgba(34,197,94,0.8))' : undefined,
          flexShrink: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frameSrc}
          alt={id}
          style={{
            position:    'absolute',
            bottom:      0,
            left:        '50%',
            transform:   isFlipped
              ? 'translateX(-50%) scaleX(-1)'
              : 'translateX(-50%)',
            height:      '100%',
            width:       'auto',
            maxWidth:    'none',
            objectFit:   'contain',
            imageRendering: 'auto',
          }}
        />
      </div>
    )
  }

  // ── Portrait / Loading fallback ────────────────────────────────────────────
  if (mode === 'loading' || mode === 'portrait') {
    const w = Math.round(STRIP_W * scale)
    const h = Math.round(STRIP_H * scale)
    return (
      <div onClick={onClick} style={{
        width: w, height: h, borderRadius: 6, overflow: 'hidden',
        border: isWorking ? '2px solid #22c55e' : '2px solid rgba(255,255,255,0.10)',
        cursor: onClick ? 'pointer' : 'default',
        opacity: mode === 'loading' ? 0.4 : 1,
        animation: 'float-idle 3s ease-in-out infinite',
        flexShrink: 0,
      }}>
        <Image src={portraitSrc} alt={id} width={w} height={h}
          className="w-full h-full object-cover object-top"
          style={{ imageRendering: 'pixelated' }} />
      </div>
    )
  }

  // ── Strip mode ──────────────────────────────────────────────────────────────
  if (mode === 'strip') {
    let animFile: string
    let flipX = false
    if (state === 'walk') {
      if (direction === 'right') { animFile = 'walk_left'; flipX = true }
      else animFile = `walk_${direction}`
    } else {
      animFile = state
    }

    const src    = `${stripDir}/${animFile}.png`
    const cssKey = `strip_${nameLC}_${animFile}`
    injectAnim(cssKey, STRIP_W, STRIP_FRAMES, 0)

    const fps      = state === 'idle' ? 3 : 8
    const duration = (1 / fps * STRIP_FRAMES).toFixed(3)

    return (
      <div onClick={onClick} title={id} style={{
        width:              STRIP_W,
        height:             STRIP_H,
        backgroundImage:    `url('${src}')`,
        backgroundRepeat:   'no-repeat',
        backgroundPosition: '0px 0px',
        backgroundSize:     'auto',
        imageRendering:     'pixelated',
        zoom:    scale,
        cursor:  onClick ? 'pointer' : 'default',
        animation: STRIP_FRAMES > 1
          ? `${cssKey} ${duration}s steps(${STRIP_FRAMES}) infinite`
          : 'float-idle 3s ease-in-out infinite',
        filter:    isWorking ? 'drop-shadow(0 0 5px rgba(34,197,94,0.7))' : undefined,
        transform: flipX ? 'scaleX(-1)' : undefined,
      }} />
    )
  }

  // ── Sheet / LPC mode ────────────────────────────────────────────────────────
  const src = mode === 'lpc' ? lpcSrc : customSrc

  // animKey already defined above — resolve fallback for sheet mode
  const sheetAnimKey = cfg.animations[animKey] ? animKey : (state === 'walk' ? 'walk' : state)
  const anim = cfg.animations[sheetAnimKey] ?? cfg.animations['idle'] ?? cfg.animations['walk']
  if (!anim) return null

  const cssKey  = `sheet_${nameLC}_${sheetAnimKey}`
  injectAnim(cssKey, cfg.frameW, anim.frames, anim.yStart)
  const duration = (1 / anim.fps * anim.frames).toFixed(3)

  return (
    <div onClick={onClick} title={id} style={{
      width:              cfg.frameW,
      height:             anim.frameH,
      backgroundImage:    `url('${src}')`,
      backgroundRepeat:   'no-repeat',
      backgroundPosition: `0px -${anim.yStart}px`,
      backgroundSize:     'auto',
      imageRendering:     'pixelated',
      zoom:    scale,
      cursor:  onClick ? 'pointer' : 'default',
      animation: anim.frames > 1
        ? `${cssKey} ${duration}s steps(${anim.frames}) infinite`
        : 'float-idle 3s ease-in-out infinite',
      filter:    isWorking ? 'drop-shadow(0 0 5px rgba(34,197,94,0.7))' : undefined,
      transform: anim.flipX ? 'scaleX(-1)' : undefined,
    }} />
  )
}
