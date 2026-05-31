import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface ListTasksRequest {
  userId: string
  apiKey?: string
  limit?: number
}

export async function POST(req: NextRequest) {
  try {
    const body: ListTasksRequest = await req.json()
    const { userId, apiKey, limit = 10 } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    // Verify API key (optional)
    if (apiKey && apiKey !== process.env.MOBILE_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's tasks
    const { data: tasks, error } = await supabase
      .from('agent_tasks')
      .select('id, title, status, priority, created_at')
      .eq('created_by', userId)
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch tasks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      )
    }

    // Log action
    await supabase.from('agent_logs').insert({
      agent_name: 'VoiceNLP',
      action_desc: `🎤 Voice: Listed ${tasks?.length || 0} tasks for ${userId}`,
      status: 'success',
    })

    return NextResponse.json({
      status: 'success',
      data: { tasks: tasks || [] },
    })
  } catch (error) {
    console.error('[voice/list-tasks error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
