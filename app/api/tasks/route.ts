import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// GET /api/tasks - Fetch all tasks with filters
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Get query params
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const project = url.searchParams.get('project')
    const assigned_to = url.searchParams.get('assigned_to')

    let query = supabase
      .from('b3_tasks')
      .select('*')
      .order('due_date', { ascending: true })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (project) {
      query = query.eq('project', project)
    }
    if (assigned_to) {
      if (assigned_to === '__unassigned') {
        query = query.is('assigned_to', null)
      } else {
        query = query.eq('assigned_to', assigned_to)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/tasks - Create new task
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    const {
      task_number,
      title,
      description,
      project,
      priority,
      status,
      assigned_to,
      assigned_by,
      due_date,
      progress_percent,
      tags,
    } = body

    if (!task_number || !title || !project) {
      return NextResponse.json(
        { error: 'Missing required fields: task_number, title, project' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('b3_tasks')
      .insert([
        {
          task_number,
          title,
          description,
          project,
          priority: priority || 'medium',
          status: status || 'todo',
          assigned_to,
          assigned_by,
          due_date,
          progress_percent: progress_percent || 0,
          tags: tags || [],
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
