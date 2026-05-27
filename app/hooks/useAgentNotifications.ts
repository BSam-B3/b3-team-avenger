'use client'

/**
 * useAgentNotifications
 *
 * Subscribe ผ่าน Supabase Realtime — เมื่อ task status เปลี่ยนเป็น 'done'
 * สร้าง toast notification ขึ้นมา
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AgentToast {
  id:       string
  agentId:  string
  taskSnip: string
  at:       number   // Date.now()
}

export function useAgentNotifications() {
  const [toasts, setToasts] = useState<AgentToast[]>([])
  const seen = useRef(new Set<string>())

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('agent-task-done-notify')
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'agent_tasks',
        },
        (payload) => {
          const task = payload.new as {
            id:          string
            assigned_to: string
            task_detail: string
            status:      string
          }

          if (task.status !== 'done') return
          if (seen.current.has(task.id)) return
          seen.current.add(task.id)

          const toastId = `${task.id}-${Date.now()}`
          const toast: AgentToast = {
            id:       toastId,
            agentId:  task.assigned_to ?? '?',
            taskSnip: (task.task_detail ?? '').slice(0, 60),
            at:       Date.now(),
          }

          setToasts(prev => [toast, ...prev].slice(0, 5))  // max 5 stacked

          // Auto-dismiss after 4s
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toastId))
          }, 4000)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  return { toasts, dismiss }
}
