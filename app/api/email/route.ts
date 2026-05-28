/**
 * GET /api/email
 * ดึง emails ตาม scope/provider
 *
 * Query params:
 *   provider = 'gmail' | 'm365' | 'cit' | 'work' | 'all' (default: all)
 *   limit    = number (default: 10)
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchEmailsByScope, getEmailStatus } from '@/lib/email'
import type { EmailScope } from '@/lib/email'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const provider = (searchParams.get('provider') ?? 'all') as EmailScope | 'gmail' | 'm365' | 'cit'
  const limit    = Math.min(20, parseInt(searchParams.get('limit') ?? '10', 10))

  // map provider param to EmailScope
  const scopeMap: Record<string, EmailScope> = {
    gmail: 'personal',
    m365:  'pandv',
    cit:   'cit',
    work:  'work',
    all:   'all',
  }
  const scope: EmailScope = scopeMap[provider] ?? 'all'

  const status = await getEmailStatus()
  const emails = await fetchEmailsByScope(scope, limit)

  return NextResponse.json({
    ok:      true,
    status,
    scope,
    count:   emails.length,
    emails,
  })
}
