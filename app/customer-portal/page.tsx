'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Quotation {
  id: string
  total_cost: number
  status: string
  created_at: string
  template: { name: string }
  salesperson: string
}

interface Checklist {
  id: string
  site_type: string
  status: string
  created_at: string
  progress: number
  item_count: number
}

export default function CustomerPortalPage() {
  const [customerId, setCustomerId] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [tab, setTab] = useState<'quotations' | 'checklists'>('quotations')
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<string>()
  const [approvalNotes, setApprovalNotes] = useState('')
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(
        `/api/tier5/customer-portal?customerId=${customerId}&action=quotations`
      )
      if (response.ok) {
        setAuthenticated(true)
        await fetchQuotations()
      } else {
        alert('Customer ID not found')
      }
    } catch (err) {
      alert('Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function fetchQuotations() {
    try {
      const response = await fetch(`/api/tier5/customer-portal?customerId=${customerId}&action=quotations`)
      const data = await response.json()
      setQuotations(data.data.quotations || [])
    } catch (err) {
      console.error('[portal] fetch quotations error:', err)
    }
  }

  async function fetchChecklists() {
    try {
      const response = await fetch(`/api/tier5/customer-portal?customerId=${customerId}&action=checklists`)
      const data = await response.json()
      setChecklists(data.data.checklists || [])
    } catch (err) {
      console.error('[portal] fetch checklists error:', err)
    }
  }

  async function handleQuotationAction(action: 'approve' | 'reject') {
    if (!selectedQuote) return

    try {
      const response = await fetch('/api/tier5/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          quotationId: selectedQuote,
          action,
          notes: approvalNotes,
        }),
      })

      if (response.ok) {
        alert(`Quotation ${action}ed successfully!`)
        setSelectedQuote(undefined)
        setApprovalNotes('')
        await fetchQuotations()
      }
    } catch (err) {
      alert('Error processing quotation')
    }
  }

  if (!authenticated) {
    return (
      <div
        style={{
          padding: '40px',
          background: '#0d1117',
          minHeight: '100vh',
          color: '#f0f6fc',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ maxWidth: '400px', width: '100%' }}>
          <h1 style={{ marginBottom: '30px', textAlign: 'center' }}>🔐 Customer Portal</h1>

          <form
            onSubmit={handleLogin}
            style={{
              background: '#161b22',
              border: '1px solid #30363d',
              padding: '30px',
              borderRadius: '8px',
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Customer ID
              </label>
              <input
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder="e.g., cust-001"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #30363d',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: '#0d1117',
                  color: '#f0f6fc',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? '#d1d5db' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '⏳ Logging in...' : '✓ Login'}
            </button>
          </form>

          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              background: '#f0f9ff',
              color: '#0c4a6e',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          >
            <strong>ℹ️ Demo:</strong> Use customer ID from your quotation email
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', background: '#0d1117', minHeight: '100vh', color: '#f0f6fc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>🏢 Customer Portal — {customerId}</h1>
        <button
          onClick={() => {
            setAuthenticated(false)
            setCustomerId('')
          }}
          style={{
            padding: '8px 12px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => {
            setTab('quotations')
            fetchQuotations()
          }}
          style={{
            padding: '10px 16px',
            background: tab === 'quotations' ? '#3b82f6' : '#30363d',
            color: '#f0f6fc',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: tab === 'quotations' ? 'bold' : 'normal',
          }}
        >
          💼 Quotations ({quotations.length})
        </button>
        <button
          onClick={() => {
            setTab('checklists')
            fetchChecklists()
          }}
          style={{
            padding: '10px 16px',
            background: tab === 'checklists' ? '#3b82f6' : '#30363d',
            color: '#f0f6fc',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: tab === 'checklists' ? 'bold' : 'normal',
          }}
        >
          🔧 Checklists ({checklists.length})
        </button>
      </div>

      {/* Quotations Tab */}
      {tab === 'quotations' && (
        <div>
          {quotations.length === 0 ? (
            <div
              style={{
                background: '#161b22',
                border: '1px solid #30363d',
                padding: '40px',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#4b5563',
              }}
            >
              No quotations yet
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {quotations.map((q) => (
                <div
                  key={q.id}
                  style={{
                    background: '#161b22',
                    border: '1px solid #30363d',
                    padding: '20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    borderLeft: selectedQuote === q.id ? '4px solid #3b82f6' : '4px solid transparent',
                  }}
                  onClick={() => setSelectedQuote(q.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{q.template.name}</div>
                      <div style={{ fontSize: '12px', color: '#4b5563' }}>
                        From: {q.salesperson} | {new Date(q.created_at).toLocaleDateString('th-TH')}
                      </div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#60a5fa' }}>
                      ฿{q.total_cost.toLocaleString('th-TH')}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      background:
                        q.status === 'sent'
                          ? '#bbf7d0'
                          : q.status === 'approved'
                            ? '#86efac'
                            : '#fecaca',
                      color:
                        q.status === 'sent'
                          ? '#065f46'
                          : q.status === 'approved'
                            ? '#166534'
                            : '#7f1d1d',
                    }}
                  >
                    {q.status === 'sent'
                      ? 'Pending Your Review'
                      : q.status === 'approved'
                        ? 'Approved'
                        : 'Rejected'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Approval Form */}
          {selectedQuote && quotations.find((q) => q.id === selectedQuote)?.status === 'sent' && (
            <div
              style={{
                marginTop: '30px',
                background: '#161b22',
                border: '2px solid #3b82f6',
                padding: '20px',
                borderRadius: '8px',
              }}
            >
              <h3 style={{ marginBottom: '15px' }}>Approve or Reject This Quotation?</h3>

              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add notes (optional)"
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px',
                  border: '1px solid #30363d',
                  borderRadius: '4px',
                  background: '#0d1117',
                  color: '#f0f6fc',
                  marginBottom: '15px',
                  boxSizing: 'border-box',
                }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleQuotationAction('approve')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => handleQuotationAction('reject')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Checklists Tab */}
      {tab === 'checklists' && (
        <div style={{ display: 'grid', gap: '15px' }}>
          {checklists.length === 0 ? (
            <div
              style={{
                background: '#161b22',
                border: '1px solid #30363d',
                padding: '40px',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#4b5563',
              }}
            >
              No checklists yet
            </div>
          ) : (
            checklists.map((c) => (
              <div
                key={c.id}
                style={{
                  background: '#161b22',
                  border: '1px solid #30363d',
                  padding: '20px',
                  borderRadius: '8px',
                }}
              >
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{c.site_type}</div>
                  <div style={{ fontSize: '12px', color: '#4b5563' }}>
                    Started: {new Date(c.created_at).toLocaleDateString('th-TH')} | Status: {c.status}
                  </div>
                </div>

                <div
                  style={{
                    height: '8px',
                    background: '#30363d',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '10px',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: c.status === 'completed' ? '#22c55e' : '#60a5fa',
                      width: `${c.progress}%`,
                    }}
                  />
                </div>

                <div style={{ fontSize: '12px', color: '#4b5563' }}>
                  {c.progress}% Complete ({Math.round((c.progress / 100) * c.item_count)}/{c.item_count} items)
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
