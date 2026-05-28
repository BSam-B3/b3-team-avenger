/**
 * POST /api/email/reply
 * Nam drafts an email reply → saves to email_drafts for B3 approval
 * B3 calls PATCH with { id, action: 'send' | 'discard' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken } from '@/lib/email/tokens'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// ─── POST: save draft ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { to, subject, body, thread_id, in_reply_to, provider } = await req.json() as {
    to: string; subject: string; body: string
    thread_id?: string; in_reply_to?: string; provider: 'gmail' | 'm365'
  }

  const { data, error } = await supabase.from('app_settings').upsert({
    key:   `email_draft_${Date.now()}`,
    value: { to, subject, body, thread_id, in_reply_to, provider, status: 'pending', created_at: new Date().toISOString() },
  }).select('key').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, draft_key: data.key })
}

// ─── PATCH: send or discard draft ────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const { draft_key, action } = await req.json() as { draft_key: string; action: 'send' | 'discard' }

  const { data } = await supabase.from('app_settings').select('value').eq('key', draft_key).single()
  if (!data) return NextResponse.json({ error: 'draft not found' }, { status: 404 })

  if (action === 'discard') {
    await supabase.from('app_settings').delete().eq('key', draft_key)
    return NextResponse.json({ ok: true })
  }

  const draft = data.value as { to: string; subject: string; body: string; thread_id?: string; in_reply_to?: string; provider: string }

  if (draft.provider === 'gmail') {
    const token = await getValidAccessToken('gmail')
    if (!token) return NextResponse.json({ error: 'Gmail not connected' }, { status: 400 })

    // Build RFC 2822 message
    const raw = btoa([
      `To: ${draft.to}`,
      `Subject: ${draft.subject}`,
      'Content-Type: text/plain; charset=UTF-8',
      draft.in_reply_to ? `In-Reply-To: ${draft.in_reply_to}` : '',
      draft.in_reply_to ? `References: ${draft.in_reply_to}` : '',
      '',
      draft.body,
    ].filter(Boolean).join('\r\n'))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    const body: Record<string, string> = { raw }
    if (draft.thread_id) body.threadId = draft.thread_id

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const result = await res.json()
    if (!res.ok) return NextResponse.json({ error: result?.error?.message ?? 'send failed' }, { status: 500 })

    await supabase.from('app_settings').delete().eq('key', draft_key)
    await supabase.from('agent_logs').insert({ agent_name: 'Nam', action_desc: `📧 ส่ง email ตอบ: ${draft.subject}`, status: 'completed' })
    return NextResponse.json({ ok: true, messageId: result.id })
  }

  return NextResponse.json({ error: 'provider not supported' }, { status: 400 })
}
