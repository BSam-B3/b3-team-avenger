import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface CreateTicketRequest {
  title: string
  description?: string
  userId: string
  apiKey?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateTicketRequest = await req.json()
    const { title, description, userId, apiKey } = body

    if (!title || !userId) {
      return NextResponse.json(
        { error: 'Missing title or userId' },
        { status: 400 }
      )
    }

    // Verify API key (optional)
    if (apiKey && apiKey !== process.env.MOBILE_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create ticket in database
    const { data: ticket, error } = await supabase
      .from('agent_tasks')
      .insert({
        title,
        description: description || title,
        created_by: userId,
        status: 'pending',
        priority: 'normal',
      })
      .select('id')
      .single()

    if (error || !ticket) {
      console.error('Failed to create ticket:', error)
      return NextResponse.json(
        { error: 'Failed to create ticket' },
        { status: 500 }
      )
    }

    // Log action
    await supabase.from('agent_logs').insert({
      agent_name: 'VoiceNLP',
      action_desc: `🎤 Voice ticket created: "${title}"`,
      status: 'success',
    })

    return NextResponse.json({
      status: 'success',
      data: { ticketId: ticket.id },
    })
  } catch (error) {
    console.error('[voice/create-ticket error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
