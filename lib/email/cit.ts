/**
 * lib/email/cit.ts
 * C.I.T. Computer email via IMAP (mail.citcomputer.co.th:993)
 * ไม่ใช้ OAuth — ใช้ username/password ผ่าน env vars
 */

import { fetchCITEmails, isCITConfigured } from './cit-imap'
import type { EmailMessage } from './gmail'

export async function fetchCITMessages(maxResults = 10): Promise<EmailMessage[]> {
  if (!isCITConfigured()) return []

  const raw = await fetchCITEmails(maxResults)
  return raw.map(m => ({
    id:       m.id,
    provider: 'cit' as const,
    from:     m.from,
    subject:  m.subject,
    date:     m.date,
    snippet:  m.snippet || '(ไม่มี preview)',
    isRead:   m.isRead,
  }))
}

export { isCITConfigured }
