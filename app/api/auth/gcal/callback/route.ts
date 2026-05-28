/**
 * GET /api/auth/gcal/callback
 * รับ code จาก Google → แลก token → เก็บเป็น provider='gcal'
 */

import { NextRequest, NextResponse } from 'next/server'
import { saveToken } from '@/lib/email/tokens'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=gcal_denied`)
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  `${appUrl}/api/auth/gcal/callback`,
        grant_type:    'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error('no access token')

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userData = await userRes.json()

    await saveToken({
      provider:      'gcal',
      email:         userData.email ?? '',
      access_token:  tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? '',
      expires_at:    new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      scope:         tokenData.scope ?? '',
    })

    return NextResponse.redirect(`${appUrl}/settings?success=gcal`)

  } catch (err) {
    console.error('[GCal callback error]', err)
    return NextResponse.redirect(`${appUrl}/settings?error=gcal_failed`)
  }
}
