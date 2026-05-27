import { createServerSupabase } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createServerSupabase()

  const [{ data: logs }, { data: tasks }] = await Promise.all([
    supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(80),
    supabase.from('agent_tasks').select('*').order('created_at', { ascending: false }).limit(30),
  ])

  return <DashboardClient initialLogs={logs ?? []} initialTasks={tasks ?? []} />
}
