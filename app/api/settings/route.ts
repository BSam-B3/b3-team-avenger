/**
 * GET  /api/settings  — load b3 avenger settings + backend status
 * POST /api/settings  — save setting key/value
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { detectBackend, getAvailableBackends } from '@/lib/ai/client'
import { getToken } from '@/lib/email/tokens'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const B3_KEYS = ['b3_telegram_token','b3_telegram_chat_id','b3_idle_hours','b3_search_enabled','b3_ai_priority']

export async function GET() {
  const { data } = await supabase
    .from('app_settings')
    .select('setting_key, setting_value, description, updated_at')
    .in('setting_key', B3_KEYS)

  const settings: Record<string, unknown> = {}
  for (const row of data ?? []) {
    settings[row.setting_key as string] = row.setting_value
  }

  const backends = getAvailableBackends()
  const backendStatus = {
    gemini:   !!process.env.GEMINI_API_KEY,
    groq:     !!process.env.GROQ_API_KEY,
    claude:   !!process.env.ANTHROPIC_API_KEY,
    openai:   !!process.env.OPENAI_API_KEY,
    active:   detectBackend(),
    all:      backends,
  }

  // Real OAuth token connection status
  const [gmailTok, m365Tok, citTok, gcalTok] = await Promise.all([
    getToken('gmail'), getToken('m365'), getToken('cit'), getToken('gcal'),
  ])

  const connections = {
    gmail: { connected: !!gmailTok?.refresh_token, email: gmailTok?.email ?? '' },
    m365:  { connected: !!m365Tok?.refresh_token,  email: m365Tok?.email  ?? '' },
    cit:   { connected: !!citTok?.refresh_token,   email: citTok?.email   ?? '' },
    gcal:  { connected: !!gcalTok?.refresh_token,  email: gcalTok?.email  ?? '' },
  }

  const emailStatus = {
    google_client_id:  !!process.env.GOOGLE_CLIENT_ID,
    microsoft_client:  !!process.env.MICROSOFT_CLIENT_ID,
  }

  return NextResponse.json({ ok: true, settings, backendStatus, emailStatus, connections, rows: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { key, value } = await req.json() as { key: string; value: unknown }
  if (!B3_KEYS.includes(key)) return NextResponse.json({ error: 'invalid key' }, { status: 400 })

  const { error } = await supabase
    .from('app_settings')
    .upsert({ setting_key: key, setting_value: value, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
