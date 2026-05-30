'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TaskRow {
  id: string
  task_number: string
  title: string
  description: string
  project: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'todo' | 'in_progress' | 'done'
  assigned_to: string | null
  assigned_by: string | null
  created_at: string
  updated_at: string
  due_date: string | null
  progress_percent: number
  tags: string[]
  assigned_agent?: string
  agent_type?: 'AI' | 'Manual' | 'Hybrid'
  integration_type?: 'API' | 'Local' | 'Hybrid' | 'Manual'
  external_tools?: string[]
}

const STATUS_TABS = [
  { val: 'all', label: '📋 ทั้งหมด' },
  { val: 'todo', label: '📌 ต้องทำ' },
  { val: 'in_progress', label: '⚙️ กำลังทำ' },
  { val: 'done', label: '✅ เสร็จแล้ว' },
]

const statusColor: Record<string, string> = {
  todo: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  done: 'bg-green-100 text-green-700',
}

const priorityColor: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const priorityEmoji: Record<string, string> = {
  low: '🟢',
  medium: '🟡',
  high: '🔸',
  critical: '🔴',
}

// Real tasks from today's work
const MOCK_TASKS: TaskRow[] = [
  {
    id: '1',
    task_number: 'TASK-001',
    title: 'Smart KB Deduplication System',
    description: 'Implement CIT knowledge base dedup with Gemini AI - Schema, API, UI modal integration',
    project: 'CIT',
    priority: 'critical',
    status: 'done',
    assigned_to: 'Claude',
    assigned_by: 'B3',
    created_at: '2026-05-30T10:25:00Z',
    updated_at: '2026-05-30T10:42:00Z',
    due_date: '2026-05-30T15:00:00Z',
    progress_percent: 100,
    tags: ['Database', 'API', 'Gemini AI', 'CIT'],
  },
  {
    id: '2',
    task_number: 'TASK-002',
    title: 'Asset Diagnostics PowerShell Script',
    description: 'Equipment diagnostic script with JSON output for Gemini AI sales opportunity detection',
    project: 'CIT',
    priority: 'high',
    status: 'done',
    assigned_to: 'Claude',
    assigned_by: 'B3',
    created_at: '2026-05-30T10:42:00Z',
    updated_at: '2026-05-30T11:00:00Z',
    due_date: '2026-05-30T15:00:00Z',
    progress_percent: 100,
    tags: ['PowerShell', 'Windows', 'Gemini AI'],
  },
  {
    id: '3',
    task_number: 'TASK-003',
    title: 'Equipment Analysis API Endpoint',
    description: 'POST /api/equipment/analyze - Gemini AI rules + custom analysis for upsell detection',
    project: 'CIT',
    priority: 'high',
    status: 'done',
    assigned_to: 'Claude',
    assigned_by: 'B3',
    created_at: '2026-05-30T10:42:00Z',
    updated_at: '2026-05-30T11:00:00Z',
    due_date: '2026-05-30T15:00:00Z',
    progress_percent: 100,
    tags: ['API', 'Gemini AI', 'CIT'],
  },
  {
    id: '4',
    task_number: 'TASK-004',
    title: 'Task Board Creation (B3-Team-Avenger)',
    description: 'Create Task Board UI in B3-Team-Avenger dashboard for real-time progress tracking',
    project: 'B3-Team-Avenger',
    priority: 'high',
    status: 'done',
    assigned_to: 'Claude',
    assigned_by: 'B3',
    created_at: '2026-05-30T11:00:00Z',
    updated_at: '2026-05-30T11:08:00Z',
    due_date: '2026-05-30T15:00:00Z',
    progress_percent: 100,
    tags: ['UI/UX', 'Dashboard', 'Feature'],
  },
  {
    id: '5',
    task_number: 'TASK-005',
    title: 'Compile AssetCollector.exe',
    description: 'Convert PowerShell script to Windows executable using PS2EXE module',
    project: 'CIT',
    priority: 'high',
    status: 'todo',
    assigned_to: 'B3',
    assigned_by: 'B3',
    created_at: '2026-05-30T11:00:00Z',
    updated_at: '2026-05-30T11:00:00Z',
    due_date: '2026-05-30T13:00:00Z',
    progress_percent: 0,
    tags: ['Build', 'Windows', 'Deployment'],
  },
  {
    id: '6',
    task_number: 'TASK-006',
    title: 'Test KB Dedup System on Live CIT',
    description: 'Verify Smart KB dedup works end-to-end: ticket linking, usage tracking, AI search improvement',
    project: 'CIT',
    priority: 'high',
    status: 'todo',
    assigned_to: 'B3',
    assigned_by: 'B3',
    created_at: '2026-05-30T11:00:00Z',
    updated_at: '2026-05-30T11:00:00Z',
    due_date: '2026-05-30T14:00:00Z',
    progress_percent: 0,
    tags: ['Testing', 'CIT', 'QA'],
  },
  {
    id: '7',
    task_number: 'TASK-007',
    title: 'Deploy Asset Diagnostics to USB Drives',
    description: 'Copy AssetCollector.exe to 10-20 USB drives, test on 3-5 customer machines',
    project: 'CIT',
    priority: 'medium',
    status: 'todo',
    assigned_to: null,
    assigned_by: 'B3',
    created_at: '2026-05-30T11:00:00Z',
    updated_at: '2026-05-30T11:00:00Z',
    due_date: '2026-06-02T17:00:00Z',
    progress_percent: 0,
    tags: ['Deployment', 'USB', 'QA'],
  },
  {
    id: '8',
    task_number: 'TASK-008',
    title: 'Test Equipment Upload + Gemini Analysis',
    description: 'Upload diagnostic JSON to /api/equipment/upload, verify Gemini detects opportunities correctly',
    project: 'CIT',
    priority: 'high',
    status: 'todo',
    assigned_to: 'B3',
    assigned_by: 'B3',
    created_at: '2026-05-30T11:00:00Z',
    updated_at: '2026-05-30T11:00:00Z',
    due_date: '2026-06-02T12:00:00Z',
    progress_percent: 0,
    tags: ['Testing', 'API', 'Gemini'],
  },
]

function ProgressBar({ progress }: { progress: number }) {
  const barColor = progress === 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-orange-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${progress}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 min-w-fit">{progress}%</span>
    </div>
  )
}

export default function TasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [assignedFilter, setAssignedFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [searchText, setSearchText] = useState('')

  // Load tasks from API
  useEffect(() => {
    async function loadTasks() {
      try {
        const query = new URLSearchParams()
        if (statusFilter !== 'all') query.append('status', statusFilter)
        if (projectFilter) query.append('project', projectFilter)
        if (assignedFilter) query.append('assigned_to', assignedFilter)

        const response = await fetch(`/api/tasks?${query.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setTasks(data || [])
        }
      } catch (err) {
        console.error('Failed to load tasks:', err)
        setTasks(MOCK_TASKS) // Fallback to mock data
      } finally {
        setLoading(false)
      }
    }

    loadTasks()
  }, [statusFilter, projectFilter, assignedFilter])

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false
    if (priorityFilter && task.priority !== priorityFilter) return false
    if (projectFilter && task.project !== projectFilter) return false
    if (assignedFilter) {
      if (assignedFilter === '__unassigned') {
        if (task.assigned_to) return false
      } else if (!task.assigned_to?.includes(assignedFilter)) return false
    }
    if (searchText) {
      const search = searchText.toLowerCase()
      return (
        task.title.toLowerCase().includes(search) ||
        task.task_number.toLowerCase().includes(search) ||
        task.description.toLowerCase().includes(search)
      )
    }
    return true
  })

  // Count by status
  const counts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  }

  // Get unique projects
  const projects = Array.from(new Set(tasks.map(t => t.project)))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 Task Board</h1>
              <p className="text-sm text-gray-600 mt-1">ติดตามความก้าวหน้าของงาน Development ทั้งหมด</p>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-lg text-green-600">{counts.done}</span>
              <span className="text-gray-400"> / {counts.all}</span> เสร็จแล้ว
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <input
              type="text"
              placeholder="🔍 ค้นหา task..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* Project filter */}
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">โปรเจค (ทั้งหมด)</option>
              {projects.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Priority filter */}
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">ลำดับความสำคัญ (ทั้งหมด)</option>
              <option value="low">🟢 ต่ำ</option>
              <option value="medium">🟡 ปานกลาง</option>
              <option value="high">🔸 สูง</option>
              <option value="critical">🔴 ฉุกเฉิน</option>
            </select>

            {/* Assigned filter */}
            <select
              value={assignedFilter}
              onChange={e => setAssignedFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">ผู้รับผิดชอบ (ทั้งหมด)</option>
              <option value="Claude">Claude</option>
              <option value="B3">B3</option>
              <option value="__unassigned">⚪ ยังไม่ได้มอบหมาย</option>
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.val}
              onClick={() => setStatusFilter(tab.val)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                statusFilter === tab.val
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs opacity-70">({counts[tab.val as keyof typeof counts]})</span>
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
              <div key={task.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  {/* Left: Status badge */}
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusColor[task.status]}`}>
                      {task.status === 'todo' && '📌'}
                      {task.status === 'in_progress' && '⚙️'}
                      {task.status === 'done' && '✅'}
                      {' '}
                      {task.status === 'todo' && 'ต้องทำ'}
                      {task.status === 'in_progress' && 'กำลังทำ'}
                      {task.status === 'done' && 'เสร็จแล้ว'}
                    </span>
                  </div>

                  {/* Center: Task details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-gray-500">{task.task_number}</span>
                      <h3 className="text-base font-semibold text-gray-900">{task.title}</h3>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${priorityColor[task.priority]} flex-shrink-0`}>
                        {priorityEmoji[task.priority]} {task.priority}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        📂 {task.project}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>

                    {/* Tags + Agent/Integration info */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {task.tags.map(tag => (
                        <span key={tag} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                      {/* Agent badge */}
                      {task.assigned_agent && (
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          task.assigned_agent === 'Claude' ? 'bg-purple-100 text-purple-700' :
                          task.assigned_agent === 'Gemini' ? 'bg-orange-100 text-orange-700' :
                          task.assigned_agent === 'Openclaw' ? 'bg-cyan-100 text-cyan-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          🤖 {task.assigned_agent}
                        </span>
                      )}
                      {/* Integration type badge */}
                      {task.integration_type && (
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          task.integration_type === 'API' ? 'bg-green-100 text-green-700' :
                          task.integration_type === 'Local' ? 'bg-yellow-100 text-yellow-700' :
                          task.integration_type === 'Hybrid' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {task.integration_type === 'API' && '🌐'}
                          {task.integration_type === 'Local' && '💻'}
                          {task.integration_type === 'Hybrid' && '⚡'}
                          {task.integration_type === 'Manual' && '✋'}
                          {' '}{task.integration_type}
                        </span>
                      )}
                      {/* External tools */}
                      {task.external_tools && task.external_tools.length > 0 && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded" title={task.external_tools.join(', ')}>
                          🔧 {task.external_tools.slice(0, 2).join(', ')}{task.external_tools.length > 2 ? '...' : ''}
                        </span>
                      )}
                    </div>

                    <ProgressBar progress={task.progress_percent} />
                  </div>

                  {/* Right: Meta info */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-2 text-xs text-gray-600 min-w-fit">
                    <div>
                      {task.assigned_to ? (
                        <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                          👤 {task.assigned_to}
                        </div>
                      ) : (
                        <div className="text-gray-400">ยังไม่ได้มอบหมาย</div>
                      )}
                    </div>
                    {task.due_date && (
                      <div className={new Date(task.due_date).getTime() < Date.now() ? 'text-red-600 font-semibold' : ''}>
                        📅 {new Date(task.due_date).toLocaleDateString('th-TH')}
                      </div>
                    )}
                    <div className="text-gray-500">
                      {new Date(task.updated_at).toLocaleDateString('th-TH')} {new Date(task.updated_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500 text-lg">ไม่มี task ที่ตรงกับเงื่อนไข</p>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">📊 สรุป:</span> {counts.done} งานเสร็จแล้ว | {counts.in_progress} งานกำลังดำเนิน | {counts.todo} งานต้องทำ | รวม {counts.all} งาน
          </p>
        </div>
      </div>
    </div>
  )
}
