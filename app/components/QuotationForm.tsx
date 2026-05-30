'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface QuotationFormProps {
  onSuccess?: () => void
}

export default function QuotationForm({ onSuccess }: QuotationFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const supabase = createClient()

  const [formData, setFormData] = useState({
    customerId: '',
    templateId: '',
    salesPersonId: '',
    markupPct: 25,
  })

  const handleLoadTemplates = async () => {
    try {
      const { data } = await supabase.from('quotation_templates').select()
      setTemplates(data || [])
    } catch (err) {
      setError('Failed to load templates')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(undefined)

    try {
      const response = await fetch('/api/quotation/create-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to create quotation')
      }

      setSuccess(true)
      setFormData({ customerId: '', templateId: '', salesPersonId: '', markupPct: 25 })
      onSuccess?.()

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <h2>📝 Create Quotation</h2>

      {error && (
        <div
          style={{
            background: '#fecaca',
            color: '#991b1b',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '15px',
            fontSize: '14px',
          }}
        >
          ❌ {error}
        </div>
      )}

      {success && (
        <div
          style={{
            background: '#bbf7d0',
            color: '#065f46',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '15px',
            fontSize: '14px',
          }}
        >
          ✅ Quotation created! Waiting for boss approval via Telegram...
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
            Customer ID
          </label>
          <input
            type="text"
            value={formData.customerId}
            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            placeholder="e.g., cust-001"
            required
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
            Template
          </label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button
              type="button"
              onClick={handleLoadTemplates}
              style={{
                padding: '8px 12px',
                background: '#e5e7eb',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Load Templates
            </button>
          </div>
          <select
            value={formData.templateId}
            onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
            required
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          >
            <option value="">Select a template...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (฿{t.base_cost.toLocaleString('th-TH')})
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
            Salesperson ID
          </label>
          <input
            type="text"
            value={formData.salesPersonId}
            onChange={(e) => setFormData({ ...formData, salesPersonId: e.target.value })}
            placeholder="e.g., john"
            required
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
            Markup % (0-100)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.markupPct}
              onChange={(e) => setFormData({ ...formData, markupPct: parseInt(e.target.value) })}
              style={{ flex: 1, height: '6px', cursor: 'pointer' }}
            />
            <span style={{ minWidth: '40px', textAlign: 'right', fontWeight: 'bold' }}>
              {formData.markupPct}%
            </span>
          </div>
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
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading ? '⏳ Creating...' : '✉️ Send for Approval'}
        </button>
      </form>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '6px', fontSize: '12px', color: '#0c4a6e' }}>
        <strong>ℹ️ Info:</strong> After submission, your boss will receive a Telegram message with [✅ Approve] and [❌ Reject]
        buttons. Approved quotations will be automatically sent to the customer.
      </div>
    </div>
  )
}
