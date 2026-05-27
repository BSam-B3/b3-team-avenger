/**
 * Multi-backend AI client — Groq-first with automatic fallback
 * Priority: GROQ_API_KEY → GEMINI_API_KEY → ANTHROPIC_API_KEY → OPENAI_API_KEY → template
 *
 * Fallback triggers automatically on:
 *   - Rate limit / quota exceeded (429)
 *   - Service unavailable (503)
 *   - Any other API error
 *
 * .env.local keys:
 *   GROQ_API_KEY=gsk_...           ← Llama 3.3 70B, free 14,400 req/day (PRIMARY)
 *   GEMINI_API_KEY=AIza...         ← Gemini 2.0 Flash, free tier (FALLBACK)
 *   ANTHROPIC_API_KEY=sk-ant-...   ← Claude Haiku (RESERVE)
 *   OPENAI_API_KEY=sk-...          ← GPT-4o Mini (LAST RESORT)
 */

import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

export type AIBackend = 'groq' | 'gemini' | 'claude' | 'openai' | 'template'

// ─── Usage tracking ───────────────────────────────────────────────────────────

export interface AIUsage {
  backend:     AIBackend
  tokensIn:    number
  tokensOut:   number
  costUsd:     number   // approximate cost in USD
}

// Approximate pricing per 1M tokens (USD) — updated 2025
const COST_PER_M: Record<AIBackend, { in: number; out: number }> = {
  groq:     { in: 0.59,  out: 0.79  },   // Llama 3.3 70B
  gemini:   { in: 0.075, out: 0.30  },   // Gemini 2.0 Flash
  claude:   { in: 0.80,  out: 4.00  },   // Claude Haiku 4.5
  openai:   { in: 0.15,  out: 0.60  },   // GPT-4o Mini
  template: { in: 0,     out: 0     },
}

function calcCost(backend: AIBackend, tokensIn: number, tokensOut: number): number {
  const rate = COST_PER_M[backend]
  return (tokensIn * rate.in + tokensOut * rate.out) / 1_000_000
}

// ─── Supabase client (lazy — only needed for usage logging) ───────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function logUsage(
  agentId:  string,
  usage:    AIUsage,
  taskId?:  string,
): Promise<void> {
  try {
    await getSupabase().from('api_usage_logs').insert({
      agent_id:   agentId,
      backend:    usage.backend,
      tokens_in:  usage.tokensIn,
      tokens_out: usage.tokensOut,
      cost_usd:   usage.costUsd,
      task_id:    taskId ?? null,
    })
  } catch {
    // Non-critical — never block main flow
  }
}

// ─── Backend detection ────────────────────────────────────────────────────────

// Gemini first — fallback to Groq when quota full
export function getAvailableBackends(): AIBackend[] {
  const backends: AIBackend[] = []
  if (process.env.GEMINI_API_KEY)    backends.push('gemini')
  if (process.env.GROQ_API_KEY)      backends.push('groq')
  if (process.env.ANTHROPIC_API_KEY) backends.push('claude')
  if (process.env.OPENAI_API_KEY)    backends.push('openai')
  backends.push('template')
  return backends
}

export function detectBackend(): AIBackend {
  return getAvailableBackends()[0]
}

export interface AICallOptions {
  system:      string
  userMessage: string
  maxTokens?:  number
  history?:    { role: 'user' | 'assistant'; content: string }[]
  jsonMode?:   boolean
}

// Returns true for errors that should trigger fallback to next backend
function isRetryableError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return (
    msg.includes('429')           ||   // rate limit
    msg.includes('rate limit')    ||   // rate limit text
    msg.includes('quota')         ||   // quota exceeded
    msg.includes('503')           ||   // service unavailable
    msg.includes('overloaded')    ||   // model overloaded
    msg.includes('unavailable')   ||   // service down
    msg.includes('timeout')            // timeout
  )
}

// ─── Core: callAI (backward-compatible, returns string) ──────────────────────

export async function callAI(opts: AICallOptions): Promise<string> {
  const { reply } = await callAIWithUsage(opts)
  return reply
}

// ─── New: callAIWithUsage (returns reply + token usage) ──────────────────────

export interface AIResult {
  reply:   string
  usage:   AIUsage
}

export async function callAIWithUsage(opts: AICallOptions): Promise<AIResult> {
  const { system, userMessage, maxTokens = 350, history = [] } = opts
  const backends = getAvailableBackends()
  const errors: string[] = []

  for (const backend of backends) {
    if (backend === 'template') break

    try {
      if (backend === 'groq')   return await callGroq(system, userMessage, maxTokens, history)
      if (backend === 'gemini') return await callGemini(system, userMessage, maxTokens, history)
      if (backend === 'claude') return await callClaude(system, userMessage, maxTokens, history)
      if (backend === 'openai') return await callOpenAI(system, userMessage, maxTokens, history)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${backend}: ${msg.substring(0, 80)}`)

      if (isRetryableError(err)) {
        console.warn(`[AI] ${backend} rate-limited → switching to next backend`)
      } else {
        console.warn(`[AI] ${backend} error → trying next backend:`, msg.substring(0, 120))
      }
      // Always continue to next backend regardless of error type
    }
  }

  throw new Error(`all-backends-failed: ${errors.join(' | ')}`)
}

/**
 * callAITracked — callAI + automatic Supabase usage logging
 * Use this in workers where we know the agent ID
 */
export async function callAITracked(
  opts:    AICallOptions,
  agentId: string,
  taskId?: string,
): Promise<string> {
  const { reply, usage } = await callAIWithUsage(opts)
  // Fire-and-forget logging
  logUsage(agentId, usage, taskId).catch(() => {})
  return reply
}

// ─── Groq (Llama 3.3 70B — PRIMARY) ─────────────────────────────────────────

async function callGroq(
  system: string,
  userMessage: string,
  maxTokens: number,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<AIResult> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: userMessage },
      ],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? `Groq ${res.status}`)

  const tokensIn  = data.usage?.prompt_tokens     ?? 0
  const tokensOut = data.usage?.completion_tokens ?? 0
  return {
    reply: (data.choices?.[0]?.message?.content ?? '').trim(),
    usage: { backend: 'groq', tokensIn, tokensOut, costUsd: calcCost('groq', tokensIn, tokensOut) },
  }
}

// ─── Gemini 2.0 Flash (FALLBACK) ─────────────────────────────────────────────

async function callGemini(
  system: string,
  userMessage: string,
  maxTokens: number,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<AIResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: system,
    generationConfig: { maxOutputTokens: maxTokens },
  })

  const chatHistory = history.map(h => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }],
  }))

  const chat   = model.startChat({ history: chatHistory })
  const result = await chat.sendMessage(userMessage)

  const tokensIn  = result.response.usageMetadata?.promptTokenCount     ?? 0
  const tokensOut = result.response.usageMetadata?.candidatesTokenCount ?? 0
  return {
    reply: result.response.text().trim(),
    usage: { backend: 'gemini', tokensIn, tokensOut, costUsd: calcCost('gemini', tokensIn, tokensOut) },
  }
}

// ─── Claude Haiku (RESERVE) ───────────────────────────────────────────────────

async function callClaude(
  system: string,
  userMessage: string,
  maxTokens: number,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<AIResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const messages: Anthropic.MessageParam[] = [
    ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user', content: userMessage },
  ]

  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    system,
    messages,
  })

  const tokensIn  = res.usage.input_tokens
  const tokensOut = res.usage.output_tokens
  return {
    reply: res.content[0].type === 'text' ? res.content[0].text.trim() : '',
    usage: { backend: 'claude', tokensIn, tokensOut, costUsd: calcCost('claude', tokensIn, tokensOut) },
  }
}

// ─── GPT-4o Mini (LAST RESORT) ───────────────────────────────────────────────

async function callOpenAI(
  system: string,
  userMessage: string,
  maxTokens: number,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<AIResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: userMessage },
      ],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? `OpenAI ${res.status}`)

  const tokensIn  = data.usage?.prompt_tokens     ?? 0
  const tokensOut = data.usage?.completion_tokens ?? 0
  return {
    reply: (data.choices?.[0]?.message?.content ?? '').trim(),
    usage: { backend: 'openai', tokensIn, tokensOut, costUsd: calcCost('openai', tokensIn, tokensOut) },
  }
}

// ─── Parse JSON from AI output ────────────────────────────────────────────────

export async function callAIForJSON<T>(opts: AICallOptions, fallback: T): Promise<T> {
  try {
    const raw = await callAI({ ...opts, jsonMode: true })
    const stripped = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
    const arrayMatch = stripped.match(/\[[\s\S]*\]/)
    const objMatch   = stripped.match(/\{[\s\S]*\}/)
    const target = arrayMatch?.[0] ?? objMatch?.[0] ?? stripped
    return JSON.parse(target) as T
  } catch {
    return fallback
  }
}
