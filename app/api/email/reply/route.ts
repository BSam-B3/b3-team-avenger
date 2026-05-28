/**
 * POST /api/email/reply    — Nam saves draft email for B3 approval
 * GET  /api/email/reply    — list pending drafts
 * PATCH /api/email/reply   — B3 sends or discards draft
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken } from '@/lib/email/tokens'
import { sendCITEmail } from '@/lib/email/cit-imap'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// ─── GET: pending drafts ──────────────────────────────────────────────────────

export async function GET() {
  const { data } = await supabase
    .from('email_drafts')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20)
  return NextResponse.json({ ok: true, drafts: data ?? [] })
}

// ─── POST: save draft ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    provider: 'gmail' | 'm365'
    to_addr: string; subject: string; body: string
    thread_id?: string; in_reply_to?: string
    original_from?: string; original_subject?: string
  }

  const { data, error } = await supabase
    .from('email_drafts')
    .insert({
      provider:         body.provider,
      to_addr:          body.to_addr,
      subject:          body.subject,
      body:             body.body,
      thread_id:        body.thread_id ?? null,
      in_reply_to:      body.in_reply_to ?? null,
      original_from:    body.original_from ?? null,
      original_subject: body.original_subject ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('agent_logs').insert({
    agent_name: 'Nam', action_desc: `📧 ร่าง reply: "${body.subject.slice(0, 60)}"`, status: 'completed',
  })

  return NextResponse.json({ ok: true, id: data.id })
}

// ─── PATCH: send or discard ───────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const { id, action } = await req.json() as { id: string; action: 'send' | 'discard' }

  const { data: draft } = await supabase.from('email_drafts').select('*').eq('id', id).single()
  if (!draft) return NextResponse.json({ error: 'draft not found' }, { status: 404 })

  if (action === 'discard') {
    await supabase.from('email_drafts').update({ status: 'discarded' }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  // Send via Gmail
  if (draft.provider === 'gmail') {
    const token = await getValidAccessToken('gmail')
    if (!token) return NextResponse.json({ error: 'Gmail not connected or missing send scope. Please reconnect Gmail in /settings.' }, { status: 400 })

    const lines = [
      `To: ${draft.to_addr}`,
      `Subject: ${draft.subject.startsWith('Re:') ? draft.subject : `Re: ${draft.subject}`}`,
      'Content-Type: text/plain; charset=UTF-8',
      'MIME-Version: 1.0',
      draft.in_reply_to ? `In-Reply-To: ${draft.in_reply_to}` : '',
      draft.in_reply_to ? `References: ${draft.in_reply_to}` : '',
      '',
      draft.body,
    ].filter(Boolean).join('\r\n')

    const raw = Buffer.from(lines).toString('base64url')

    const body: Record<string, string> = { raw }
    if (draft.thread_id) body.threadId = draft.thread_id

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const result = await res.json()

    if (!res.ok) {
      console.error('[Email send error]', result)
      return NextResponse.json({ error: result?.error?.message ?? 'send failed' }, { status: 500 })
    }

    await supabase.from('email_drafts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id)
    await supabase.from('agent_logs').insert({ agent_name: 'Nam', action_desc: `📧 ส่ง email: "${draft.subject}"`, status: 'completed' })
    return NextResponse.json({ ok: true, messageId: result.id })
  }

  // M365 send
  if (draft.provider === 'm365') {
    const token = await getValidAccessToken('m365')
    if (!token) return NextResponse.json({ error: 'M365 not connected' }, { status: 400 })

    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject:    draft.subject.startsWith('Re:') ? draft.subject : `Re: ${draft.subject}`,
          body:       { contentType: 'Text', content: draft.body },
          toRecipients: [{ emailAddress: { address: draft.to_addr } }],
        },
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: err?.error?.message ?? 'send failed' }, { status: 500 })
    }

    await supabase.from('email_drafts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id)
    await supabase.from('agent_logs').insert({ agent_name: 'Nam', action_desc: `📧 ส่ง email M365: "${draft.subject}"`, status: 'completed' })
    return NextResponse.json({ ok: true })
  }

  // CIT SMTP (IMAP-based, no OAuth)
  if (draft.provider === 'cit') {
    const result = await sendCITEmail({
      to:      draft.to_addr,
      subject: draft.subject.startsWith('Re:') ? draft.subject : `Re: ${draft.subject}`,
      text:    draft.body,
    })
    if (!result.ok) return NextResponse.json({ error: result.error ?? 'CIT send failed' }, { status: 500 })
    await supabase.from('email_drafts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id)
    await supabase.from('agent_logs').insert({ agent_name: 'Nam', action_desc: `📧 ส่ง CIT email: "${draft.subject}"`, status: 'completed' })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unsupported provider' }, { status: 400 })
}
