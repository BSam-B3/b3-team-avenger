// TIER 5: Advanced Mobile Voice Gateway
// Features:
// - NLP-based intent detection (placeholder for Gemini integration)
// - Context awareness (previous commands)
// - Multi-language support
// - Offline queuing

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateApiKey, validateRequiredFields, createErrorResponse, createSuccessResponse } from '@/lib/api/validation'
import { sendTelegramMessage } from '@/lib/notifications/telegram'
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis-client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AdvancedVoiceRequest {
  transcript: string
  userId: string
  apiKey: string
  language?: 'th' | 'en'
  context?: {
    previousCommandId?: string
    location?: string
    urgency?: 'low' | 'normal' | 'high'
  }
}

// NLP: Gemini-powered intent detection
async function detectIntentWithContext(
  transcript: string,
  _userId: string,
  context?: any
): Promise<{ intent: string; confidence: number; parameters: any }> {
  const geminiKey = process.env.GEMINI_API_KEY

  // Try Gemini first
  if (geminiKey) {
    try {
      const prompt = `You are an IT office assistant NLP. Analyze this voice command and return JSON only.

Command: "${transcript}"
${context?.previousCommandId ? `Previous context: ${context.previousCommandId}` : ''}

Return exactly this JSON (no markdown):
{"intent":"<one of: create-ticket|create-ticket-urgent|create-quotation|check-email|fetch-brief|check-status|follow-up-action|unknown>","confidence":<0.0-1.0>,"parameters":{"customer":"<if mentioned>","priority":"<urgent|high|normal|low>","description":"<summary of what was requested>"}}`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 256 } })
        }
      )
      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (text) {
        const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, ''))
        return parsed
      }
    } catch {
      // Fall through to keyword fallback
    }
  }

  // Keyword fallback
  const lower = transcript.toLowerCase()
  const map: [string, string[], number][] = [
    ['create-ticket-urgent', ['urgent','critical','emergency','ฉุกเฉิน','ด่วน'], 0.95],
    ['create-ticket',        ['ticket','issue','problem','report','แจ้ง','ปัญหา'], 0.9],
    ['create-quotation',     ['quote','quotation','ใบเสนอ','ราคา'], 0.9],
    ['check-email',          ['email','mail','อีเมล','inbox'], 0.85],
    ['fetch-brief',          ['brief','summary','today','schedule','สรุป','วันนี้'], 0.85],
    ['check-status',         ['status','progress','update','ตรวจสอบ'], 0.8],
  ]
  let best = { intent: 'unknown', confidence: 0, parameters: {} as Record<string, any> }
  for (const [intent, kws, conf] of map) {
    const hits = kws.filter(k => lower.includes(k)).length
    if (hits > 0 && conf > best.confidence) best = { intent, confidence: conf * (hits / kws.length), parameters: {} }
  }
  return best
}

// Language support
async function translateIfNeeded(text: string, targetLang: string): Promise<string> {
  // Placeholder: would integrate with Gemini for actual translation
  if (targetLang === 'th') {
    const thaiMap: Record<string, string> = {
      urgent: 'ฉุกเฉิน',
      critical: 'วิกฤติ',
      'check email': 'ตรวจสอบอีเมล',
    }
    for (const [en, th] of Object.entries(thaiMap)) {
      text = text.replace(en, th)
    }
  }
  return text
}

// Offline queuing
async function queueOfflineCommand(userId: string, command: any): Promise<void> {
  // Store in database for later processing
  await supabase.from('offline_queue').insert({
    user_id: userId,
    command: command,
    queued_at: new Date().toISOString(),
    processed: false,
  })
}

// Main handler
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AdvancedVoiceRequest

    // Validation
    const missingField = validateRequiredFields(body, ['transcript', 'userId', 'apiKey'])
    if (missingField) {
      return createErrorResponse(
        {
          code: 'MISSING_FIELD',
          message: `Missing required field: ${missingField}`,
          status: 400,
        }
      )
    }

    if (!validateApiKey(body.apiKey, process.env.MOBILE_API_KEY || '')) {
      return createErrorResponse(
        {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
          status: 401,
        }
      )
    }

    // Translate if needed
    let transcript = body.transcript
    if (body.language === 'th') {
      transcript = await translateIfNeeded(transcript, 'th')
    }

    // Advanced intent detection with context
    const { intent, confidence, parameters } = await detectIntentWithContext(
      transcript,
      body.userId,
      body.context
    )

    // Store command
    const { data: commandData, error: cmdErr } = await supabase
      .from('voice_commands')
      .insert({
        user_id: body.userId,
        transcript,
        intent,
        parameters,
        language: body.language || 'en',
        confidence,
      })
      .select()
      .single()

    if (cmdErr) throw cmdErr

    // For offline commands, queue them
    if (body.context?.urgency === 'high') {
      await queueOfflineCommand(body.userId, {
        commandId: commandData.id,
        intent,
        parameters,
        priority: 'high',
      })
    }

    // Send Telegram alert (if high urgency)
    if (body.context?.urgency === 'high' && process.env.TELEGRAM_BOT_TOKEN) {
      await sendTelegramMessage({
        chat_id: process.env.TELEGRAM_CHAT_ID || '',
        text: `🚨 <b>URGENT Voice Command</b>\n\nIntent: ${intent}\nConfidence: ${(confidence * 100).toFixed(0)}%\n\n"${transcript}"`,
        parse_mode: 'HTML',
      })
    }

    return createSuccessResponse({
      commandId: commandData.id,
      intent,
      confidence: (confidence * 100).toFixed(0) + '%',
      parameters,
      queued: body.context?.urgency === 'high',
    })
  } catch (err) {
    console.error('[tier5] voice error:', err)
    return createErrorResponse(
      {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        status: 500,
      }
    )
  }
}

// GET: List offline commands
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')

    if (!userId) {
      return createErrorResponse(
        {
          code: 'MISSING_FIELD',
          message: 'userId required',
          status: 400,
        }
      )
    }

    const { data, error } = await supabase
      .from('offline_queue')
      .select()
      .eq('user_id', userId)
      .eq('processed', false)
      .order('queued_at', { ascending: true })

    if (error) throw error

    return createSuccessResponse(data)
  } catch (err) {
    console.error('[tier5] get offline error:', err)
    return createErrorResponse(
      {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        status: 500,
      }
    )
  }
}
