/**
 * Task Manager Helper
 * For Claude to auto-update tasks when work is done
 */

export interface TaskUpdate {
  task_number?: string
  status?: 'todo' | 'in_progress' | 'done'
  progress_percent?: number
  notes?: string
}

export interface TaskCreate {
  task_number: string
  title: string
  description: string
  project: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  assigned_to: string
  due_date?: string
  tags: string[]
}

/**
 * Create a new task
 * Usage: await createTask({ task_number: 'TASK-XXX', title: 'Work on feature X', ... })
 */
export async function createTask(taskData: TaskCreate) {
  try {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    })

    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.statusText}`)
    }

    const task = await response.json()
    console.log(`✅ Created task: ${task.task_number}`)
    return task
  } catch (err) {
    console.error('Error creating task:', err)
    throw err
  }
}

/**
 * Update task status and progress
 * Usage: await updateTask('TASK-001', { status: 'done', progress_percent: 100 })
 */
export async function updateTask(taskNumber: string, updates: Partial<TaskUpdate>) {
  try {
    // First, fetch the task to get its ID
    const tasksResponse = await fetch('/api/tasks?task_number=' + taskNumber)
    const tasks = await tasksResponse.json()

    if (!tasks || tasks.length === 0) {
      console.warn(`⚠️ Task not found: ${taskNumber}`)
      return null
    }

    const task = tasks[0]

    // Update the task
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updates,
        updated_at: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to update task: ${response.statusText}`)
    }

    const updated = await response.json()

    // Log the update
    const statusEmoji =
      updated.status === 'done'
        ? '✅'
        : updated.status === 'in_progress'
          ? '⚙️'
          : '📌'

    console.log(
      `${statusEmoji} Updated ${taskNumber}: ${updated.status} (${updated.progress_percent}%)`
    )

    return updated
  } catch (err) {
    console.error('Error updating task:', err)
    throw err
  }
}

/**
 * Shorthand: Mark task as done
 */
export async function completeTask(taskNumber: string) {
  return updateTask(taskNumber, {
    status: 'done',
    progress_percent: 100,
  })
}

/**
 * Shorthand: Mark task as in progress
 */
export async function startTask(taskNumber: string) {
  return updateTask(taskNumber, {
    status: 'in_progress',
    progress_percent: 10,
  })
}

/**
 * Shorthand: Update progress percentage
 */
export async function updateProgress(taskNumber: string, percent: number) {
  return updateTask(taskNumber, {
    progress_percent: Math.min(100, percent),
    status: percent === 100 ? 'done' : 'in_progress',
  })
}
