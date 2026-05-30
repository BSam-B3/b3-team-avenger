'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

interface ErrorLog {
  id: string
  endpoint: string
  method: string
  status: number
  error: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  timestamp: string
}

export default function ErrorsPage() {
  const [errors, setErrors] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    const fetchErrors = async () => {
      setLoading(true)
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        let query = supabase
          .from('error_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(limit)

        if (filter !== 'all') {
          query = query.eq('severity', filter)
        }

        const { data, error } = await query

        if (error) throw error
        setErrors(data || [])
      } catch (err) {
        console.error('[errors] fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchErrors()
  }, [filter, limit])

  const severityColor: Record<string, string> = {
    info: 'bg-blue-900 text-blue-200',
    warning: 'bg-yellow-900 text-yellow-200',
    error: 'bg-red-900 text-red-200',
    critical: 'bg-red-950 text-red-100',
  }

  const severityIcon: Record<string, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    critical: '🚨',
  }

  const errorStats = {
    total: errors.length,
    critical: errors.filter(e => e.severity === 'critical').length,
    error: errors.filter(e => e.severity === 'error').length,
    warning: errors.filter(e => e.severity === 'warning').length,
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Error Logs</h1>
              <p className="text-gray-400 mt-2">System-wide error tracking and alerts</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Errors</p>
            <p className="text-2xl font-bold">{errorStats.total}</p>
          </div>
          <div className="bg-red-900 border border-red-700 rounded-lg p-4">
            <p className="text-red-200 text-sm">Critical</p>
            <p className="text-2xl font-bold">{errorStats.critical}</p>
          </div>
          <div className="bg-red-800 border border-red-700 rounded-lg p-4">
            <p className="text-red-200 text-sm">Errors</p>
            <p className="text-2xl font-bold">{errorStats.error}</p>
          </div>
          <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
            <p className="text-yellow-200 text-sm">Warnings</p>
            <p className="text-2xl font-bold">{errorStats.warning}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 flex gap-4 items-center">
          <div>
            <label className="text-sm text-gray-400 mr-2">Filter by severity:</label>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2"
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 mr-2">Show:</label>
            <select
              value={limit}
              onChange={e => setLimit(parseInt(e.target.value))}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2"
            >
              <option value="20">Last 20</option>
              <option value="50">Last 50</option>
              <option value="100">Last 100</option>
              <option value="500">Last 500</option>
            </select>
          </div>
        </div>

        {/* Error List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center text-gray-400">Loading...</div>
          ) : errors.length === 0 ? (
            <div className="text-center text-gray-400">No errors found</div>
          ) : (
            errors.map(err => (
              <div key={err.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{severityIcon[err.severity]}</span>
                    <div>
                      <p className="font-mono text-sm text-gray-300">
                        {err.method} {err.endpoint}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">{err.error}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${severityColor[err.severity]}`}>
                      {err.severity.toUpperCase()}
                    </span>
                    <p className="text-gray-500 text-xs mt-2">
                      {err.status}
                    </p>
                  </div>
                </div>
                <p className="text-gray-500 text-xs">
                  {new Date(err.timestamp).toLocaleString('th-TH')}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex gap-4 justify-end">
          <Link
            href="/admin/status"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
          >
            System Status
          </Link>
          <Link
            href="/admin"
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm"
          >
            Back to Admin
          </Link>
        </div>
      </div>
    </div>
  )
}
