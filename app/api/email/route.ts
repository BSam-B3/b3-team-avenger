/**
 * GET /api/email
 * ดึง emails ล่าสุดจากทุก provider ที่เชื่อมต่อแล้ว
 *
 * Query params:
 *   provider = 'gmail' | 'm365' | 'all' (default: all)
 *   limit    = number (default: 10)
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchGmailMessages } from '@/lib/email/gmail'
import { fetchM365Messages }  from '@/lib/email/m365'
import { getEmailStatus }     from '@/lib/email'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const provider = searchParams.get('provider') ?? 'all'
  const limit    = Math.min(20, parseInt(searchParams.get('limit') ?? '10', 10))

  const status = await getEmailStatus()

  const [gmailMsgs, m365Msgs] = await Promise.allSettled([
    (provider === 'all' || provider === 'gmail') && status.gmail.connected
      ? fetchGmailMessages(limit) : Promise.resolve([]),
    (provider === 'all' || provider === 'm365') && status.m365.connected
      ? fetchM365Messages(limit)  : Promise.resolve([]),
  ])

  const emails = [
    ...(gmailMsgs.status === 'fulfilled' ? gmailMsgs.value : []),
    ...(m365Msgs.status  === 'fulfilled' ? m365Msgs.value  : []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return NextResponse.json({
    ok:      true,
    status,
    count:   emails.length,
    emails,
  })
}
