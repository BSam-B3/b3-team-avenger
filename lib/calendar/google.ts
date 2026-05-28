/**
 * lib/calendar/google.ts
 * Google Calendar API — สร้าง/อ่าน/ลบนัดหมาย
 */

import { getValidAccessToken } from '@/lib/email/tokens'

export interface CalendarEvent {
  id?:          string
  summary:      string        // ชื่อนัด
  description?: string        // รายละเอียด
  location?:    string
  startTime:    string        // ISO 8601
  endTime:      string        // ISO 8601
  recurrence?:  string        // RRULE เช่น "RRULE:FREQ=MONTHLY;BYDAY=2SA"
  remindMinutes?: number      // แจ้งเตือนกี่นาทีก่อน (default 60)
}

// ─── Create event ─────────────────────────────────────────────────────────────

export async function createCalendarEvent(event: CalendarEvent): Promise<{ id: string; htmlLink: string } | null> {
  const token = await getValidAccessToken('gcal')
  if (!token) return null

  const body: Record<string, unknown> = {
    summary:     event.summary,
    description: event.description ?? '',
    location:    event.location ?? '',
    start: { dateTime: event.startTime, timeZone: 'Asia/Bangkok' },
    end:   { dateTime: event.endTime,   timeZone: 'Asia/Bangkok' },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup',  minutes: event.remindMinutes ?? 60 },
        { method: 'email',  minutes: event.remindMinutes ?? 60 },
      ],
    },
  }

  if (event.recurrence) {
    body.recurrence = [event.recurrence]
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }
  )
  const data = await res.json()
  if (!res.ok) {
    const errMsg = data?.error?.message ?? data?.error?.status ?? JSON.stringify(data)
    const errCode = data?.error?.code ?? res.status
    console.error('[GCal create error]', errCode, errMsg, JSON.stringify(data).slice(0, 500))
    return { error: `${errCode}: ${errMsg}` } as unknown as null
  }
  return { id: data.id, htmlLink: data.htmlLink }
}

// ─── List upcoming events ─────────────────────────────────────────────────────

export async function listCalendarEvents(maxResults = 10): Promise<CalendarEvent[]> {
  const token = await getValidAccessToken('gcal')
  if (!token) return []

  const timeMin = new Date().toISOString()
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&orderBy=startTime&singleEvents=true&timeMin=${timeMin}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  if (!res.ok || !data.items) return []

  return data.items.map((e: {
    id: string; summary: string; description?: string
    location?: string
    start: { dateTime?: string; date?: string }
    end:   { dateTime?: string; date?: string }
  }) => ({
    id:          e.id,
    summary:     e.summary ?? '(ไม่มีชื่อ)',
    description: e.description,
    location:    e.location,
    startTime:   e.start.dateTime ?? e.start.date ?? '',
    endTime:     e.end.dateTime   ?? e.end.date   ?? '',
  }))
}

// ─── Delete event ─────────────────────────────────────────────────────────────

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const token = await getValidAccessToken('gcal')
  if (!token) return false

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  )
  return res.status === 204
}

// ─── Parse natural language → CalendarEvent ──────────────────────────────────

export function buildDateTimeFromNL(dateStr: string, timeStr: string): { start: string; end: string } {
  const now = new Date()
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(now.getDate() + 1)

  let base = new Date()

  const lower = dateStr.toLowerCase()
  if (lower.includes('พรุ่งนี้') || lower.includes('tomorrow')) {
    base = tomorrowDate
  } else if (lower.includes('วันนี้') || lower.includes('today')) {
    base = now
  }

  // Parse time "10:00" "10.00" "10 โมง" "บ่าย 2"
  const timeMatch = timeStr.match(/(\d{1,2})[:.:]?(\d{2})?/)
  let hour = 10, minute = 0
  if (timeMatch) {
    hour   = parseInt(timeMatch[1])
    minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    if (timeStr.includes('บ่าย') || timeStr.includes('pm')) hour += 12
  }

  const start = new Date(base)
  start.setHours(hour, minute, 0, 0)
  const end = new Date(start)
  end.setHours(hour + 1, minute, 0, 0)  // default 1 ชั่วโมง

  return {
    start: start.toISOString(),
    end:   end.toISOString(),
  }
}
