/**
 * lib/email/index.ts
 * Unified email fetcher — ดึงจาก Gmail + M365 พร้อมกัน
 * แล้วจัดรูปแบบเป็น context string ให้ AI วิเคราะห์
 */

import { fetchGmailMessages } from './gmail'
import { fetchM365Messages }  from './m365'
import { getToken }           from './tokens'

export type { EmailMessage } from './gmail'

// ─── Check connection status ──────────────────────────────────────────────────

export async function getEmailStatus(): Promise<{
  gmail: { connected: boolean; email?: string }
  m365:  { connected: boolean; email?: string }
}> {
  const [gmailToken, m365Token] = await Promise.all([
    getToken('gmail'),
    getToken('m365'),
  ])
  return {
    gmail: { connected: !!gmailToken?.refresh_token, email: gmailToken?.email },
    m365:  { connected: !!m365Token?.refresh_token,  email: m365Token?.email  },
  }
}

// ─── Fetch all emails ─────────────────────────────────────────────────────────

export async function fetchAllEmails(maxPerProvider = 5) {
  const [gmailMsgs, m365Msgs] = await Promise.allSettled([
    fetchGmailMessages(maxPerProvider),
    fetchM365Messages(maxPerProvider),
  ])

  return [
    ...(gmailMsgs.status === 'fulfilled' ? gmailMsgs.value : []),
    ...(m365Msgs.status  === 'fulfilled' ? m365Msgs.value  : []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// ─── Format emails as AI context ─────────────────────────────────────────────

export async function getEmailContext(maxPerProvider = 5): Promise<string> {
  const status = await getEmailStatus()
  const connected = status.gmail.connected || status.m365.connected

  if (!connected) {
    return '\n\n## Email Status\nยังไม่ได้เชื่อมต่อ Email — ให้ B3 ไปที่ /auth เพื่อเชื่อมต่อ Gmail และ/หรือ Microsoft 365 ก่อน'
  }

  const emails = await fetchAllEmails(maxPerProvider)
  if (!emails.length) {
    return '\n\n## Email\nไม่พบ email ใหม่ใน inbox'
  }

  const lines = emails.map((e, i) => {
    const providerLabel = e.provider === 'gmail' ? '📧 Gmail' : '📨 M365'
    const readLabel     = e.isRead ? '' : ' 🔴 UNREAD'
    const dateStr       = new Date(e.date).toLocaleString('th-TH', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    return [
      `### Email ${i + 1} [${providerLabel}${readLabel}]`,
      `From: ${e.from}`,
      `Subject: ${e.subject}`,
      `Date: ${dateStr}`,
      `Preview: ${e.snippet.slice(0, 200)}`,
    ].join('\n')
  })

  const accounts: string[] = []
  if (status.gmail.connected) accounts.push(`Gmail (${status.gmail.email})`)
  if (status.m365.connected)  accounts.push(`M365 (${status.m365.email})`)

  return `\n\n## Email Inbox (${accounts.join(' + ')})\n${lines.join('\n\n')}`
}
