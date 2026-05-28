/**
 * GET /api/auth/cit/callback
 * รับ code จาก Microsoft → แลก token → เก็บเป็น provider='cit' → redirect กลับ /settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { saveToken } from '@/lib/email/tokens'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=cit_denied`)
  }

  try {
    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        redirect_uri:  `${appUrl}/api/auth/cit/callback`,
        grant_type:    'authorization_code',
        scope:         'Mail.Read offline_access User.Read',
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error(tokenData.error_description ?? 'no token')

    const userRes = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userData = await userRes.json()

    await saveToken({
      provider:      'cit',
      email:         userData.mail ?? userData.userPrincipalName ?? '',
      access_token:  tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? '',
      expires_at:    new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      scope:         tokenData.scope ?? '',
    })

    return NextResponse.redirect(`${appUrl}/settings?success=cit`)

  } catch (err) {
    console.error('[CIT callback error]', err)
    return NextResponse.redirect(`${appUrl}/settings?error=cit_failed`)
  }
}
