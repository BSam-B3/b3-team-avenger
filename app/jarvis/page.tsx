'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Checklist {
  id: string
  customer_name: string
  technician_id: string
  site_type: string
  status: string
  progress: number
  item_count: number
  created_at: string
}

export default function JarvisPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchChecklists()
  }, [])

  async function fetchChecklists() {
    try {
      const { data } = await supabase
        .from('onsite_checklists')
        .select('*, customers(name), checklist_items(*)')
        .order('created_at', { ascending: false })
        .limit(20)

      const formatted = data?.map((c: any) => ({
        id: c.id,
        customer_name: c.customers?.name || 'Unknown',
        technician_id: c.technician_id,
        site_type: c.site_type,
        status: c.status,
        progress: c.checklist_items
          ? Math.round(
              (c.checklist_items.filter((i: any) => i.status === 'done').length /
                c.checklist_items.length) *
                100
            )
          : 0,
        item_count: c.checklist_items?.length || 0,
        created_at: c.created_at,
      })) || []

      setChecklists(formatted)
    } catch (err) {
      console.error('[jarvis] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const statusColor = {
    draft: '#94a3b8',
    in_progress: '#f59e0b',
    completed: '#22c55e',
  }

  return (
    <div style={{ padding: '20px', background: '#0d1117', minHeight: '100vh', color: '#f0f6fc' }}>
      <h1 style={{ marginBottom: '30px' }}>🔧 IT Jarvis Checklists</h1>

      {loading ? (
        <p>Loading...</p>
      ) : checklists.length === 0 ? (
        <p style={{ color: '#4b5563' }}>No checklists yet</p>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {checklists.map((checklist) => (
            <div
              key={checklist.id}
              style={{
                background: '#161b22',
                border: '1px solid #30363d',
                padding: '15px',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    {checklist.customer_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#4b5563' }}>
                    {checklist.site_type} • {checklist.technician_id}
                  </div>
                </div>

                <div
                  style={{
                    background: statusColor[checklist.status as keyof typeof statusColor],
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}
                >
                  {checklist.status === 'in_progress' ? 'In Progress' : 'Completed'}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: '10px' }}>
                <div
                  style={{
                    height: '6px',
                    background: '#30363d',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: checklist.status === 'completed' ? '#22c55e' : '#60a5fa',
                      width: `${checklist.progress}%`,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
                <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '5px' }}>
                  {checklist.progress}% ({Math.round((checklist.progress / 100) * checklist.item_count)}/
                  {checklist.item_count} items)
                </div>
              </div>

              <div style={{ fontSize: '9px', color: '#4b5563' }}>
                Started {new Date(checklist.created_at).toLocaleDateString('th-TH')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
