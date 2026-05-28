/**
 * GET /api/auth/cit
 * เริ่ม CIT (C.I.T. workplace) OAuth flow — ใช้ Microsoft app เดียวกัน แต่เก็บ token แยก
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const params = new URLSearchParams({
    client_id:     process.env.MICROSOFT_CLIENT_ID!,
    redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/cit/callback`,
    response_type: 'code',
    scope:         'Mail.Read offline_access User.Read',
    response_mode: 'query',
  })

  return NextResponse.redirect(
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
  )
}
