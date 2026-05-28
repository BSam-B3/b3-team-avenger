/**
 * lib/email/cit.ts
 * ดึง email จาก C.I.T. (Microsoft/Exchange) — token เก็บแยกเป็น provider='cit'
 */

import { getValidAccessToken } from './tokens'
import type { EmailMessage } from './gmail'

export async function fetchCITMessages(maxResults = 10): Promise<EmailMessage[]> {
  const token = await getValidAccessToken('cit')
  if (!token) return []

  try {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$top=${maxResults}&$orderby=receivedDateTime desc&$select=id,from,subject,receivedDateTime,bodyPreview,isRead`,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    )
    const data = await res.json()
    if (!res.ok || !data.value?.length) return []

    return data.value.map((m: {
      id: string
      from: { emailAddress: { address: string; name: string } }
      subject: string
      receivedDateTime: string
      bodyPreview: string
      isRead: boolean
    }) => ({
      id:       m.id,
      provider: 'cit' as const,
      from:     `${m.from?.emailAddress?.name} <${m.from?.emailAddress?.address}>`,
      subject:  m.subject ?? '(no subject)',
      date:     m.receivedDateTime,
      snippet:  m.bodyPreview ?? '',
      isRead:   m.isRead ?? true,
    }))

  } catch (err) {
    console.error('[CIT] fetch error:', err)
    return []
  }
}
