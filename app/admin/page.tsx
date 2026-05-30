'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Template {
  id: string
  name: string
  solution_type: string
  base_cost: number
  description?: string
}

interface Vendor {
  id: string
  vendor_name: string
  product: string
  unit_cost: number
  lead_time_days?: number
}

export default function AdminPage() {
  const [tab, setTab] = useState<'templates' | 'vendors'>('templates')
  const [templates, setTemplates] = useState<Template[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string>()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      if (tab === 'templates') {
        const { data } = await supabase.from('quotation_templates').select().order('name')
        setTemplates(data || [])
      } else {
        const { data } = await supabase.from('vendor_db').select().order('vendor_name')
        setVendors(data || [])
      }
    } catch (err) {
      console.error('[admin] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [tab, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return

    try {
      const table = tab === 'templates' ? 'quotation_templates' : 'vendor_db'
      await supabase.from(table).delete().eq('id', id)
      fetchData()
    } catch (err) {
      console.error('[admin] delete error:', err)
    }
  }

  return (
    <div style={{ padding: '20px', background: '#0d1117', minHeight: '100vh', color: '#f0f6fc' }}>
      <h1 style={{ marginBottom: '30px' }}>⚙️ Admin Panel</h1>

      {/* Monitoring Links */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <a
          href="/admin/status"
          style={{
            padding: '10px 16px',
            background: '#10b981',
            color: '#f0f6fc',
            textDecoration: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          🟢 System Status
        </a>
        <a
          href="/admin/errors"
          style={{
            padding: '10px 16px',
            background: '#ef4444',
            color: '#f0f6fc',
            textDecoration: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          🚨 Error Logs
        </a>
        <a
          href="/admin/performance"
          style={{
            padding: '10px 16px',
            background: '#f59e0b',
            color: '#f0f6fc',
            textDecoration: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ⚡ Performance
        </a>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setTab('templates')}
          style={{
            padding: '10px 16px',
            background: tab === 'templates' ? '#3b82f6' : '#30363d',
            color: '#f0f6fc',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: tab === 'templates' ? 'bold' : 'normal',
          }}
        >
          📋 Templates ({templates.length})
        </button>
        <button
          onClick={() => setTab('vendors')}
          style={{
            padding: '10px 16px',
            background: tab === 'vendors' ? '#3b82f6' : '#30363d',
            color: '#f0f6fc',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: tab === 'vendors' ? 'bold' : 'normal',
          }}
        >
          🏭 Vendors ({vendors.length})
        </button>
      </div>

      {/* Add Button */}
      <button
        onClick={() => {
          setShowForm(!showForm)
          setEditingId(undefined)
        }}
        style={{
          padding: '10px 16px',
          background: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px',
          fontWeight: 'bold',
        }}
      >
        + Add {tab === 'templates' ? 'Template' : 'Vendor'}
      </button>

      {/* Data Table */}
      {loading ? (
        <p>Loading...</p>
      ) : tab === 'templates' ? (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #30363d' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Base Cost</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #30363d' }}>
                  <td style={{ padding: '12px' }}>{t.name}</td>
                  <td style={{ padding: '12px', color: '#4b5563' }}>{t.solution_type}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>฿{t.base_cost.toLocaleString('th-TH')}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setEditingId(t.id)
                        setShowForm(true)
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#60a5fa',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        marginRight: '8px',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #30363d' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Vendor</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Product</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Unit Cost</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Lead Time</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #30363d' }}>
                  <td style={{ padding: '12px' }}>{v.vendor_name}</td>
                  <td style={{ padding: '12px', color: '#4b5563' }}>{v.product}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>฿{v.unit_cost.toLocaleString('th-TH')}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{v.lead_time_days || '-'} days</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setEditingId(v.id)
                        setShowForm(true)
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#60a5fa',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        marginRight: '8px',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(v.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Box */}
      <div
        style={{
          marginTop: '40px',
          padding: '15px',
          background: '#f0f9ff',
          color: '#0c4a6e',
          borderRadius: '6px',
          fontSize: '12px',
        }}
      >
        <strong>ℹ️ Manage your quotation templates and vendor database</strong>
        <br />
        Changes are immediately available to all sales staff and API calls.
      </div>
    </div>
  )
}
