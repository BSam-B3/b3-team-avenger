import { NextRequest, NextResponse } from 'next/server'

// Password gate disabled — re-enable by checking b3_auth cookie
export function proxy(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
