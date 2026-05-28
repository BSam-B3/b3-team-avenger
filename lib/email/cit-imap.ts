/**
 * CIT Email via IMAP/SMTP
 * IMAP: mail.citcomputer.co.th:993 (SSL)
 * SMTP: smtp.citcomputer.co.th:465 (SSL)
 */

import { ImapFlow } from 'imapflow'
import nodemailer from 'nodemailer'

const CIT_CONFIG = {
  host:     process.env.CIT_IMAP_HOST ?? 'mail.citcomputer.co.th',
  port:     Number(process.env.CIT_IMAP_PORT ?? 993),
  user:     process.env.CIT_EMAIL ?? '',
  password: process.env.CIT_PASSWORD ?? '',
}

// ─── Read emails via IMAP ─────────────────────────────────────────────────────

export interface CITEmail {
  id:      string
  from:    string
  subject: string
  date:    string
  snippet: string
  isRead:  boolean
  uid:     number
}

export async function fetchCITEmails(limit = 15): Promise<CITEmail[]> {
  if (!CIT_CONFIG.user || !CIT_CONFIG.password) return []

  const client = new ImapFlow({
    host:    CIT_CONFIG.host,
    port:    CIT_CONFIG.port,
    secure:  true,
    auth:    { user: CIT_CONFIG.user, pass: CIT_CONFIG.password },
    logger:  false,
    tls:     { rejectUnauthorized: false },  // some on-prem mail servers have self-signed certs
  })

  const emails: CITEmail[] = []

  try {
    await client.connect()
    await client.mailboxOpen('INBOX')

    // Fetch last N messages
    const inboxStatus = await client.status('INBOX', { messages: true })
    const totalMsgs = inboxStatus.messages ?? 0
    const startSeq = Math.max(1, totalMsgs - limit + 1)
    const msgs = await client.fetch(`${startSeq}:*`, {
      envelope: true,
      flags:    true,
    })

    for await (const msg of msgs) {
      const from = msg.envelope?.from?.[0]
      const fromAddr = from?.address ?? ''
      const fromName = from?.name ?? ''
      emails.push({
        id:      msg.uid.toString(),
        from:    fromName ? `${fromName} <${fromAddr}>` : fromAddr,
        subject: msg.envelope?.subject ?? '(ไม่มีหัวข้อ)',
        date:    msg.envelope?.date?.toISOString() ?? new Date().toISOString(),
        snippet: '',
        isRead:  msg.flags?.has('\\Seen') ?? false,
        uid:     msg.uid,
      })
    }

    emails.reverse()   // newest first
  } catch (err) {
    console.error('[CIT IMAP error]', err)
  } finally {
    try { await client.logout() } catch { /* ignore */ }
  }

  return emails.slice(0, limit)
}

// ─── Send email via SMTP ──────────────────────────────────────────────────────

export async function sendCITEmail(opts: {
  to:      string
  subject: string
  text:    string
  replyTo?: string
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (!CIT_CONFIG.user || !CIT_CONFIG.password) {
    return { ok: false, error: 'CIT credentials not configured' }
  }

  const transporter = nodemailer.createTransport({
    host:    process.env.CIT_SMTP_HOST ?? 'smtp.citcomputer.co.th',
    port:    Number(process.env.CIT_SMTP_PORT ?? 465),
    secure:  true,   // SSL
    auth:    { user: CIT_CONFIG.user, pass: CIT_CONFIG.password },
    tls:     { rejectUnauthorized: false },
  })

  try {
    const info = await transporter.sendMail({
      from:    `${CIT_CONFIG.user}`,
      to:      opts.to,
      subject: opts.subject,
      text:    opts.text,
      replyTo: opts.replyTo,
    })
    return { ok: true, messageId: info.messageId }
  } catch (err) {
    console.error('[CIT SMTP error]', err)
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ─── Check if CIT is configured ──────────────────────────────────────────────

export function isCITConfigured(): boolean {
  return !!(process.env.CIT_EMAIL && process.env.CIT_PASSWORD)
}
