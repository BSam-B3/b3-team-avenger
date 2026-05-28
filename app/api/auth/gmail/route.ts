/**
 * GET /api/auth/gmail
 * เริ่ม Gmail OAuth flow — redirect ไป Google consent screen
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
    access_type:   'offline',
    prompt:        'consent',  // force refresh_token every time
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  )
}
