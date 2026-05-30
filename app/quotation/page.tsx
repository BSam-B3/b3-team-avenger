'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Draft {
  id: string
  customer_name: string
  template_name: string
  total_cost: number
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent'
  created_at: string
}

export default function QuotationPage() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchDrafts()
  }, [])

  async function fetchDrafts() {
    try {
      const { data } = await supabase
        .from('quotation_drafts')
        .select('id, customer_id, template_id, total_cost, status, created_at, customers(name), quotation_templates(name)')
        .order('created_at', { ascending: false })

      const formatted = data?.map((d: any) => ({
        id: d.id,
        customer_name: d.customers?.name || 'Unknown',
        template_name: d.quotation_templates?.name || 'Unknown',
        total_cost: d.total_cost,
        status: d.status,
        created_at: d.created_at,
      })) || []

      setDrafts(formatted)
    } catch (err) {
      console.error('[quotation] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const statusColor = {
    draft: '#94a3b8',
    pending_approval: '#f59e0b',
    approved: '#22c55e',
    rejected: '#ef4444',
    sent: '#3b82f6',
  }

  const statusLabel = {
    draft: 'Draft',
    pending_approval: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    sent: 'Sent',
  }

  return (
    <div style={{ padding: '20px', background: '#0d1117', minHeight: '100vh', color: '#f0f6fc' }}>
      <h1 style={{ marginBottom: '30px' }}>💼 Quotations</h1>

      {loading ? (
        <p>Loading...</p>
      ) : drafts.length === 0 ? (
        <p style={{ color: '#4b5563' }}>No quotations yet</p>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {drafts.map((draft) => (
            <div
              key={draft.id}
              style={{
                background: '#161b22',
                border: '1px solid #30363d',
                padding: '15px',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                    {draft.customer_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '10px' }}>
                    {draft.template_name} — ฿{draft.total_cost.toLocaleString('th-TH')}
                  </div>
                </div>

                <div
                  style={{
                    background: statusColor[draft.status],
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}
                >
                  {statusLabel[draft.status]}
                </div>
              </div>

              <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '10px' }}>
                {new Date(draft.created_at).toLocaleDateString('th-TH')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
