/**
 * lib/agents/consult.ts
 *
 * Peer Consultation System — agents ถามความเห็น agent อื่น
 *
 * เมื่อ task ซับซ้อน agent จะ consult 1 peer ก่อนตอบ:
 *
 *   Joe ← task architecture
 *     → consult Fenton (QA perspective)
 *     → synthesize: "ออกแบบให้ testable + scalable"
 *
 *   Metha ← task budget plan
 *     → consult Kom (risk perspective)
 *     → synthesize: "ROI + risk mitigation built-in"
 *
 * Mode:
 *   CONTEXT (default) — inject peer's .md knowledge, 1 API call
 *   DEEP              — actual AI-to-AI call (2 API calls), higher quality
 */

import { callAI } from '@/lib/ai/client'
import { loadAgentContext } from './context'

// ─── Peer map — who naturally consults whom ───────────────────────────────────

export const PEER_MAP: Record<string, string[]> = {
  Janie:  ['Nam', 'Raps'],
  Joe:    ['Fenton', 'Kom'],
  Enjoy:  ['Nara', 'Joe'],
  Fenton: ['Joe', 'Kom'],
  Karn:   ['Nara', 'Win'],
  Kitti:  ['Kom', 'Metha'],
  Nara:   ['Enjoy', 'Karn'],
  Metha:  ['Kom', 'Ferin'],
  Pim:    ['Metha', 'Ferin'],
  Win:    ['Karn', 'Kom'],
  Nam:    ['Janie', 'Fenton'],
  Kom:    ['Kitti', 'Metha'],
  Raps:   ['Janie', 'Nam'],
  Ferin:  ['Metha', 'Kom'],
}

// ─── Keywords ที่บ่งชี้ว่า task นี้ซับซ้อน → ควร consult ────────────────────

const COMPLEX_KEYWORDS = [
  'strategy', 'วิเคราะห์', 'ออกแบบ', 'analyze', 'compare', 'เปรียบเทียบ',
  'risk', 'ความเสี่ยง', 'contract', 'สัญญา', 'budget', 'งบ', 'plan', 'แผน',
  'vendor', 'ผู้ขาย', 'negotiate', 'pricing', 'ราคา', 'ต้นทุน', 'architecture',
  'security', 'legal', 'compliance', 'กฎหมาย', 'campaign', 'launch', 'critical',
]

export function isComplexTask(taskDetail: string): boolean {
  const lower = taskDetail.toLowerCase()
  return COMPLEX_KEYWORDS.some(kw => lower.includes(kw)) || taskDetail.length > 150
}

// ─── Consultation result ──────────────────────────────────────────────────────

export interface ConsultResult {
  peerId:     string
  insight:    string   // peer's perspective to inject into main prompt
}

/**
 * Get one peer's perspective on a task.
 *
 * mode='context' (fast): returns peer's context snippet (no extra AI call)
 * mode='deep'    (rich):  actually calls AI with peer persona → real insight
 */
export async function consultPeer(
  peerId:     string,
  taskDetail: string,
  mode:       'context' | 'deep' = 'context'
): Promise<ConsultResult> {
  const peerCtx = await loadAgentContext(peerId)

  if (mode === 'context') {
    // Fast: just extract first 400 chars of peer context as "perspective"
    const snippet = peerCtx.slice(0, 400).replace(/^#.*\n/gm, '').trim()
    return {
      peerId,
      insight: `มุมมองของ ${peerId}: ${snippet}`,
    }
  }

  // Deep: actual AI call with peer persona (slower but better quality)
  try {
    const insight = await callAI({
      system: `${peerCtx}
คุณกำลัง consult กับ agent อื่นในทีมเกี่ยวกับ task นี้
ให้มุมมองจากความเชี่ยวชาญของคุณ 1-2 ประโยค กระชับ ตรงประเด็น
ไม่ต้องรับงาน แค่ให้ perspective ของคุณ`,
      userMessage: `task ที่ถูกถาม: "${taskDetail}"\nมุมมองของคุณ ${peerId}?`,
      maxTokens: 150,
    })
    return { peerId, insight: `${peerId}: ${insight}` }
  } catch {
    // Fallback to context mode
    const snippet = peerCtx.slice(0, 300).trim()
    return { peerId, insight: `มุมมองของ ${peerId}: ${snippet}` }
  }
}

/**
 * Get consultation for a task — auto-picks the right peer
 * Returns formatted string to inject into agent's system prompt
 */
export async function getConsultation(
  agentId:    string,
  taskDetail: string,
  mode:       'context' | 'deep' = 'deep'
): Promise<string> {
  if (!isComplexTask(taskDetail)) return ''

  const peers = PEER_MAP[agentId] ?? []
  if (!peers.length) return ''

  // Consult just the first (most relevant) peer to avoid latency
  const result = await consultPeer(peers[0], taskDetail, mode)
  return `\n\n## Consultation จาก ${result.peerId}:\n${result.insight}`
}
