'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'critical'
  timestamp: string
  responseTime: number
  services?: {
    supabase: { status: string; latency: number }
    telegram: { status: string; configured: boolean }
    environment: { status: string; keysConfigured: number }
    cache: { status: string; type: string }
  }
  endpoints?: {
    morning_brief: string
    email_secretary: string
    quotation_system: string
    voice_gateway: string
    admin_panel: string
  }
  diagnostics?: {
    responseTime: number
    nodeVersion: string
    environment: string
    deployment: string
  }
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [detailed, setDetailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => {
    const fetchHealth = async () => {
      setLoading(true)
      try {
        const url = `/api/health${detailed ? '?detailed=true' : ''}`
        const res = await fetch(url)
        const data = await res.json()
        setHealth(data)
        setLastRefresh(new Date())
      } catch (err) {
        console.error('[status] fetch error:', err)
        setHealth({
          status: 'critical',
          timestamp: new Date().toISOString(),
          responseTime: 0,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchHealth()
    const interval = setInterval(fetchHealth, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [detailed])

  const statusColor = {
    healthy: 'text-green-600',
    degraded: 'text-yellow-600',
    critical: 'text-red-600',
  }

  const statusBg = {
    healthy: 'bg-green-50',
    degraded: 'bg-yellow-50',
    critical: 'bg-red-50',
  }

  const statusBorder = {
    healthy: 'border-green-200',
    degraded: 'border-yellow-200',
    critical: 'border-red-200',
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">System Status</h1>
              <p className="text-gray-400 mt-2">B3 Team Avenger — Real-time Health Monitor</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${statusColor[health?.status || 'critical']}`}>
                {health?.status?.toUpperCase() || 'CHECKING'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`rounded-lg border-2 p-6 mb-8 ${
            statusBg[health?.status || 'critical']
          } ${statusBorder[health?.status || 'critical']}`}
        >
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-gray-600 text-sm uppercase">Response Time</p>
              <p className="text-2xl font-bold">{health?.responseTime || 0}ms</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm uppercase">Status</p>
              <p className="text-2xl font-bold capitalize">{health?.status || 'unknown'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm uppercase">Timestamp</p>
              <p className="text-sm font-mono">{health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '-'}</p>
            </div>
            <div>
              <button
                onClick={() => setDetailed(!detailed)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
              >
                {detailed ? 'Simple View' : 'Details'}
              </button>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        {health?.services && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Supabase */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Supabase Database</h3>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  health.services.supabase.status === 'ok'
                    ? 'bg-green-900 text-green-200'
                    : 'bg-red-900 text-red-200'
                }`}>
                  {health.services.supabase.status.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-400 text-sm">Latency: {health.services.supabase.latency}ms</p>
            </div>

            {/* Telegram */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Telegram Bot</h3>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  health.services.telegram.status === 'ok'
                    ? 'bg-green-900 text-green-200'
                    : 'bg-yellow-900 text-yellow-200'
                }`}>
                  {health.services.telegram.status.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                Configured: {health.services.telegram.configured ? '✅' : '⚠️'}
              </p>
            </div>

            {/* Environment */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Environment</h3>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  health.services.environment.status === 'ok'
                    ? 'bg-green-900 text-green-200'
                    : 'bg-yellow-900 text-yellow-200'
                }`}>
                  {health.services.environment.status.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                Keys: {health.services.environment.keysConfigured}/13 configured
              </p>
            </div>

            {/* Cache */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Cache Layer</h3>
                <span className="px-2 py-1 rounded text-xs font-bold bg-green-900 text-green-200">
                  {health.services.cache.status.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-400 text-sm">Type: {health.services.cache.type}</p>
            </div>
          </div>
        )}

        {/* Endpoints */}
        {health?.endpoints && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Deployed Endpoints</h2>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(health.endpoints).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <p className="text-gray-400">{key.replace(/_/g, ' ').toUpperCase()}</p>
                  <p className="text-gray-200 font-mono text-xs mt-1">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagnostics */}
        {detailed && health?.diagnostics && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Diagnostics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Node Version</p>
                <p className="text-gray-200 font-mono">{health.diagnostics.nodeVersion}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Environment</p>
                <p className="text-gray-200 font-mono">{health.diagnostics.environment}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Deployment</p>
                <p className="text-gray-200 font-mono">{health.diagnostics.deployment}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Response Time</p>
                <p className="text-gray-200 font-mono">{health.diagnostics.responseTime}ms</p>
              </div>
            </div>
          </div>
        )}

        {/* Links */}
        <div className="flex gap-4 justify-end">
          <Link
            href="/admin"
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm"
          >
            Back to Admin
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
          >
            Refresh Now
          </button>
        </div>
      </div>
    </div>
  )
}
