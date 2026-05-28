/**
 * GET /api/analytics
 * Returns aggregated stats for the analytics dashboard
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET() {
  const [kpiRes, usageRes, tasksRes, msgsRes] = await Promise.allSettled([
    supabase.from('agent_kpi').select('agent_id,tasks_completed,tasks_failed'),
    supabase.from('api_usage_logs').select('backend,agent_id,tokens_in,tokens_out,cost_usd,created_at'),
    supabase.from('agent_tasks').select('assigned_to,status,created_at').order('created_at', { ascending: false }).limit(200),
    supabase.from('agent_messages').select('agent_id,created_at').eq('role', 'agent').order('created_at', { ascending: false }).limit(500),
  ])

  const kpi     = kpiRes.status     === 'fulfilled' ? (kpiRes.value.data     ?? []) : []
  const usage   = usageRes.status   === 'fulfilled' ? (usageRes.value.data   ?? []) : []
  const tasks   = tasksRes.status   === 'fulfilled' ? (tasksRes.value.data   ?? []) : []
  const msgs    = msgsRes.status    === 'fulfilled' ? (msgsRes.value.data    ?? []) : []

  // ── Total stats ──
  const totalDone    = tasks.filter((t: {status:string}) => t.status === 'done').length
  const totalFailed  = tasks.filter((t: {status:string}) => t.status === 'failed').length
  const totalCost    = usage.reduce((s: number, r: {cost_usd:number}) => s + (r.cost_usd ?? 0), 0)
  const totalTokensIn  = usage.reduce((s: number, r: {tokens_in:number}) => s + (r.tokens_in ?? 0), 0)
  const totalTokensOut = usage.reduce((s: number, r: {tokens_out:number}) => s + (r.tokens_out ?? 0), 0)

  // ── Agent leaderboard ──
  const agentMap: Record<string, { completed: number; failed: number; cost: number; messages: number }> = {}
  for (const row of kpi as {agent_id:string; tasks_completed:number; tasks_failed:number}[]) {
    agentMap[row.agent_id] = { completed: row.tasks_completed, failed: row.tasks_failed, cost: 0, messages: 0 }
  }
  for (const row of usage as {agent_id:string; cost_usd:number}[]) {
    if (!agentMap[row.agent_id]) agentMap[row.agent_id] = { completed: 0, failed: 0, cost: 0, messages: 0 }
    agentMap[row.agent_id].cost += row.cost_usd ?? 0
  }
  for (const row of msgs as {agent_id:string}[]) {
    if (!agentMap[row.agent_id]) agentMap[row.agent_id] = { completed: 0, failed: 0, cost: 0, messages: 0 }
    agentMap[row.agent_id].messages += 1
  }

  const agentLeaderboard = Object.entries(agentMap)
    .map(([id, v]) => ({
      id,
      completed:   v.completed,
      failed:      v.failed,
      messages:    v.messages,
      cost:        v.cost,
      successRate: v.completed + v.failed > 0
        ? Math.round((v.completed / (v.completed + v.failed)) * 100) : 0,
    }))
    .sort((a, b) => b.completed - a.completed)

  // ── Backend usage ──
  const backendMap: Record<string, { calls: number; cost: number }> = {}
  for (const row of usage as {backend:string; cost_usd:number}[]) {
    const b = row.backend ?? 'unknown'
    if (!backendMap[b]) backendMap[b] = { calls: 0, cost: 0 }
    backendMap[b].calls += 1
    backendMap[b].cost  += row.cost_usd ?? 0
  }
  const backendStats = Object.entries(backendMap)
    .map(([backend, v]) => ({ backend, calls: v.calls, cost: v.cost }))
    .sort((a, b) => b.calls - a.calls)

  // ── Tasks per day (last 7 days) ──
  const now = new Date()
  const days: { date: string; done: number; total: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayTasks = (tasks as {status:string; created_at:string}[]).filter(t => t.created_at.slice(0, 10) === dateStr)
    days.push({ date: dateStr, done: dayTasks.filter(t => t.status === 'done').length, total: dayTasks.length })
  }

  return NextResponse.json({
    ok: true,
    summary: { totalDone, totalFailed, totalCost, totalTokensIn, totalTokensOut, totalAgents: agentLeaderboard.length },
    agentLeaderboard,
    backendStats,
    tasksByDay: days,
  })
}
