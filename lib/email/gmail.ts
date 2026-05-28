/**
 * lib/email/gmail.ts
 * ดึง email จาก Gmail API
 */

import { getValidAccessToken } from './tokens'

export interface EmailMessage {
  id:       string
  provider: 'gmail' | 'm365'
  from:     string
  subject:  string
  date:     string
  snippet:  string
  body?:    string
  isRead:   boolean
}

export async function fetchGmailMessages(maxResults = 10): Promise<EmailMessage[]> {
  const token = await getValidAccessToken('gmail')
  if (!token) return []

  try {
    // ดึงรายการ messages
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX&q=is:unread OR newer_than:2d`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const listData = await listRes.json()
    if (!listRes.ok || !listData.messages?.length) return []

    // ดึง metadata แต่ละ message
    const messages = await Promise.allSettled(
      listData.messages.slice(0, maxResults).map(async (m: { id: string }) => {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const msg = await msgRes.json()
        const headers: { name: string; value: string }[] = msg.payload?.headers ?? []
        const labelIds: string[] = msg.labelIds ?? []

        return {
          id:       m.id,
          provider: 'gmail' as const,
          from:     headers.find(h => h.name === 'From')?.value    ?? '',
          subject:  headers.find(h => h.name === 'Subject')?.value ?? '(no subject)',
          date:     headers.find(h => h.name === 'Date')?.value    ?? '',
          snippet:  msg.snippet ?? '',
          isRead:   !labelIds.includes('UNREAD'),
        }
      })
    )

    return messages
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<EmailMessage>).value)

  } catch (err) {
    console.error('[Gmail] fetch error:', err)
    return []
  }
}
