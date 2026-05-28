/**
 * GET  /api/calendar         — ดูนัดหมายที่จะมาถึง
 * POST /api/calendar         — สร้างนัดหมายใหม่ (Janie เรียก)
 * DELETE /api/calendar?id=X  — ลบนัด
 */

import { NextRequest, NextResponse } from 'next/server'
import { createCalendarEvent, listCalendarEvents, deleteCalendarEvent } from '@/lib/calendar/google'
import { getToken } from '@/lib/email/tokens'

export async function GET() {
  const token = await getToken('gcal')
  if (!token?.refresh_token) {
    return NextResponse.json({ ok: false, connected: false, events: [] })
  }
  const events = await listCalendarEvents(10)
  return NextResponse.json({ ok: true, connected: true, events })
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    summary:       string
    description?:  string
    location?:     string
    startTime:     string
    endTime:       string
    recurrence?:   string
    remindMinutes?: number
  }

  if (!body.summary || !body.startTime || !body.endTime) {
    return NextResponse.json({ error: 'summary, startTime, endTime required' }, { status: 400 })
  }

  const result = await createCalendarEvent(body)
  if (!result) {
    return NextResponse.json({ error: 'Google Calendar not connected or API error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const ok = await deleteCalendarEvent(id)
  return NextResponse.json({ ok })
}
