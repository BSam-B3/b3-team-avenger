/**
 * lib/email/index.ts
 * Unified email fetcher — Gmail (ส่วนตัว) + M365/PANDV (บริษัท) + CIT (ที่ทำงาน)
 *
 * Smart routing:
 *   - Default (ไม่ระบุ)   → work only: PANDV + CIT (ไม่โหลด Gmail ส่วนตัว)
 *   - scope='personal'    → Gmail เท่านั้น
 *   - scope='pandv'       → M365/PANDV เท่านั้น
 *   - scope='cit'         → CIT เท่านั้น
 *   - scope='work'        → PANDV + CIT
 *   - scope='all'         → ทั้งหมด
 */

import { fetchGmailMessages } from './gmail'
import { fetchM365Messages }  from './m365'
import { fetchCITMessages, isCITConfigured } from './cit'
import { getToken }           from './tokens'

export type { EmailMessage } from './gmail'
export type EmailScope = 'personal' | 'pandv' | 'cit' | 'work' | 'all'

// ─── Account metadata ─────────────────────────────────────────────────────────

export const EMAIL_ACCOUNTS = {
  gmail: { label: 'Gmail',  alias: 'ส่วนตัว',  purpose: 'ธนาคาร โปรโมชั่น งานส่วนตัว', icon: '📧', color: '#ea4335' },
  m365:  { label: 'PANDV',  alias: 'บริษัท',   purpose: 'email P AND V HAPPYNESS',      icon: '🏢', color: '#0078d4' },
  cit:   { label: 'CIT',    alias: 'ที่ทำงาน', purpose: 'email C.I.T.',                 icon: '💼', color: '#6366f1' },
} as const

// ─── Detect which email scope is needed from task description ─────────────────

export function detectEmailScope(taskDetail: string): EmailScope {
  const lower = taskDetail.toLowerCase()

  // Explicit personal/Gmail signals
  if (['gmail', 'ส่วนตัว', 'personal', 'bank', 'ธนาคาร', 'scb', 'kbank', 'ktb', 'bbl', 'gsb', 'tmb']
    .some(kw => lower.includes(kw))) return 'personal'

  // Explicit CIT signals
  if (['cit', 'ที่ทำงาน', 'งาน cit', 'email cit', 'อีเมล cit']
    .some(kw => lower.includes(kw))) return 'cit'

  // Explicit PANDV/company signals
  if (['pandv', 'p and v', 'บริษัท', 'company', 'happyness', 'email บริษัท', 'อีเมล บริษัท']
    .some(kw => lower.includes(kw))) return 'pandv'

  // Default → work (PANDV + CIT) เพื่อประหยัด token จาก Gmail โปรโมชั่น
  return 'work'
}

// ─── Check connection status ──────────────────────────────────────────────────

export async function getEmailStatus(): Promise<{
  gmail: { connected: boolean; email?: string }
  m365:  { connected: boolean; email?: string }
  cit:   { connected: boolean; email?: string }
}> {
  const [gmailToken, m365Token, citToken] = await Promise.all([
    getToken('gmail'),
    getToken('m365'),
    getToken('cit'),
  ])
  return {
    gmail: { connected: !!gmailToken?.refresh_token, email: gmailToken?.email },
    m365:  { connected: !!m365Token?.refresh_token,  email: m365Token?.email  },
    // CIT uses IMAP (env vars), not OAuth
    cit:   { connected: isCITConfigured(), email: process.env.CIT_EMAIL },
  }
}

// ─── Fetch emails by scope ────────────────────────────────────────────────────

export async function fetchEmailsByScope(scope: EmailScope, maxPerProvider = 5) {
  const status = await getEmailStatus()

  const fetches: Promise<Awaited<ReturnType<typeof fetchGmailMessages>>>[] = []

  if ((scope === 'personal' || scope === 'all') && status.gmail.connected)
    fetches.push(fetchGmailMessages(maxPerProvider))

  if ((scope === 'pandv' || scope === 'work' || scope === 'all') && status.m365.connected)
    fetches.push(fetchM365Messages(maxPerProvider))

  if ((scope === 'cit' || scope === 'work' || scope === 'all') && status.cit.connected)
    fetches.push(fetchCITMessages(maxPerProvider))

  if (fetches.length === 0) return []

  const results = await Promise.allSettled(fetches)
  return results
    .flatMap(r => r.status === 'fulfilled' ? r.value : [])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// ─── Format emails as AI context ─────────────────────────────────────────────

export async function getEmailContext(maxPerProvider = 5, scope?: EmailScope): Promise<string> {
  const status = await getEmailStatus()
  const anyConnected = status.gmail.connected || status.m365.connected || status.cit.connected

  if (!anyConnected) {
    return '\n\n## Email Status\nยังไม่ได้เชื่อมต่อ Email — ให้ B3 ไปที่ /settings เพื่อเชื่อมต่อ Gmail / PANDV / CIT ก่อน'
  }

  const resolvedScope = scope ?? 'work'
  const emails = await fetchEmailsByScope(resolvedScope, maxPerProvider)

  if (!emails.length) {
    return '\n\n## Email\nไม่พบ email ใหม่ใน inbox'
  }

  const providerLabel = (p: string) => {
    if (p === 'gmail') return '📧 Gmail (ส่วนตัว)'
    if (p === 'm365')  return '🏢 PANDV (บริษัท)'
    if (p === 'cit')   return '💼 CIT (ที่ทำงาน)'
    return p
  }

  const lines = emails.map((e, i) => {
    const readLabel = e.isRead ? '' : ' 🔴 UNREAD'
    const dateStr   = new Date(e.date).toLocaleString('th-TH', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    return [
      `### Email ${i + 1} [${providerLabel(e.provider)}${readLabel}]`,
      `From: ${e.from}`,
      `Subject: ${e.subject}`,
      `Date: ${dateStr}`,
      `Preview: ${e.snippet.slice(0, 200)}`,
    ].join('\n')
  })

  const scopeLabel: Record<EmailScope, string> = {
    personal: 'Gmail ส่วนตัว',
    pandv:    'PANDV บริษัท',
    cit:      'CIT ที่ทำงาน',
    work:     'PANDV + CIT (งาน)',
    all:      'ทั้งหมด',
  }

  return `\n\n## Email Inbox [${scopeLabel[resolvedScope]}]\n${lines.join('\n\n')}`
}
