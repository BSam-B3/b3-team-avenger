/**
 * Voice NLP Intent Parser
 * Uses Regex pattern matching to detect intents and extract payloads
 * Supports Thai and English voice commands
 */

export interface VoiceIntent {
  intent: 'CREATE_TICKET' | 'SHOW_TASKS' | 'UNKNOWN'
  payload: Record<string, any>
}

export function parseVoiceCommand(text: string): VoiceIntent {
  const cleanText = text.trim().toLowerCase()

  // Intent A: Create Ticket (สร้างเคส | แจ้งปัญหา | ซ่อม | create ticket | new case)
  const ticketMatch = cleanText.match(
    /(สร้างเคส|แจ้งปัญหา|ซ่อม|create ticket|new case)\s*(.*)/i
  )
  if (ticketMatch && ticketMatch[2]?.trim()) {
    return {
      intent: 'CREATE_TICKET',
      payload: {
        title: ticketMatch[2].trim() || 'เคสแจ้งซ่อมด่วน',
        description: ticketMatch[2].trim(),
      },
    }
  }

  // Intent B: Show Tasks (เปิดดูงาน | มีงานอะไรบ้าง | show tasks | what are my tasks)
  if (/(เปิดดูงาน|มีงานอะไรบ้าง|show.*tasks|what.*tasks)/i.test(cleanText)) {
    return {
      intent: 'SHOW_TASKS',
      payload: {},
    }
  }

  return {
    intent: 'UNKNOWN',
    payload: { raw: cleanText },
  }
}

/**
 * Execute voice command intent
 */
export async function executeVoiceIntent(
  intent: VoiceIntent,
  userId: string,
  apiKey: string
): Promise<{ commandId: string; status: string }> {
  switch (intent.intent) {
    case 'CREATE_TICKET': {
      const response = await fetch('/api/voice/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: intent.payload.title,
          description: intent.payload.description,
          userId,
          apiKey,
        }),
      })

      if (!response.ok) throw new Error('Failed to create ticket')
      const data = await response.json()
      return { commandId: data.data?.ticketId || 'unknown', status: 'created' }
    }

    case 'SHOW_TASKS': {
      const response = await fetch('/api/voice/list-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, apiKey }),
      })

      if (!response.ok) throw new Error('Failed to fetch tasks')
      const data = await response.json()
      return { commandId: 'list-tasks', status: 'fetched' }
    }

    default:
      throw new Error(`Unknown intent: ${intent.intent}`)
  }
}
