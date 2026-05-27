import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
  res.cookies.delete('b3_auth')
  return res
}
