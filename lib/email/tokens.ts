/**
 * lib/email/tokens.ts
 * จัดการ OAuth tokens ใน Supabase — get / save / refresh
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export interface OAuthToken {
  provider:      'gmail' | 'm365' | 'cit'
  email:         string
  access_token:  string
  refresh_token: string
  expires_at:    string
  scope:         string
}

// ─── Save / Update token ──────────────────────────────────────────────────────

export async function saveToken(token: OAuthToken): Promise<void> {
  await supabase.from('oauth_tokens').upsert({
    provider:      token.provider,
    email:         token.email,
    access_token:  token.access_token,
    refresh_token: token.refresh_token,
    expires_at:    token.expires_at,
    scope:         token.scope,
    updated_at:    new Date().toISOString(),
  }, { onConflict: 'provider' })
}

// ─── Get stored token ─────────────────────────────────────────────────────────

export async function getToken(provider: 'gmail' | 'm365' | 'cit'): Promise<OAuthToken | null> {
  const { data } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('provider', provider)
    .single()
  return data as OAuthToken | null
}

// ─── Get valid access token (auto-refresh if expired) ────────────────────────

export async function getValidAccessToken(provider: 'gmail' | 'm365' | 'cit'): Promise<string | null> {
  const token = await getToken(provider)
  if (!token?.refresh_token) return null

  // Check if expired (with 5min buffer)
  const expiresAt = new Date(token.expires_at).getTime()
  const now = Date.now()
  if (expiresAt - now > 5 * 60 * 1000) {
    return token.access_token  // still valid
  }

  // Refresh the token
  try {
    if (provider === 'gmail') return await refreshGmailToken(token.refresh_token)
    if (provider === 'm365')  return await refreshM365Token(token.refresh_token, 'm365')
    if (provider === 'cit')   return await refreshM365Token(token.refresh_token, 'cit')
  } catch {
    return null
  }
  return null
}

// ─── Refresh Gmail token ──────────────────────────────────────────────────────

async function refreshGmailToken(refresh_token: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token,
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) return null

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  await supabase.from('oauth_tokens').update({
    access_token: data.access_token,
    expires_at:   expiresAt,
    updated_at:   new Date().toISOString(),
  }).eq('provider', 'gmail')

  return data.access_token
}

// ─── Refresh M365 token ───────────────────────────────────────────────────────

async function refreshM365Token(refresh_token: string, provider: 'm365' | 'cit'): Promise<string | null> {
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token,
      grant_type:    'refresh_token',
      scope:         'Mail.Read offline_access',
    }),
  })
  const data = await res.json()
  if (!data.access_token) return null

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  await supabase.from('oauth_tokens').update({
    access_token: data.access_token,
    expires_at:   expiresAt,
    updated_at:   new Date().toISOString(),
  }).eq('provider', provider)

  return data.access_token
}
