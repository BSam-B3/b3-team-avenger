'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

interface PerformanceMetric {
  endpoint: string
  method: string
  response_time: number
  status_code?: number
  timestamp: string
}

interface EndpointStats {
  endpoint: string
  method: string
  avg: number
  min: number
  max: number
  count: number
  p95: number
  status: 'fast' | 'slow' | 'critical'
}

export default function PerformancePage() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [stats, setStats] = useState<EndpointStats[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h')

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true)
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Calculate time range
        const now = new Date()
        let since: Date
        switch (timeRange) {
          case '1h':
            since = new Date(now.getTime() - 3600000)
            break
          case '7d':
            since = new Date(now.getTime() - 7 * 24 * 3600000)
            break
          default:
            since = new Date(now.getTime() - 24 * 3600000)
        }

        // Fetch metrics
        const { data: metricsData } = await supabase
          .from('performance_metrics')
          .select('*')
          .gte('timestamp', since.toISOString())
          .order('timestamp', { ascending: false })
          .limit(200)

        if (metricsData) {
          setMetrics(metricsData)

          // Calculate stats by endpoint
          const endpointMap = new Map<string, PerformanceMetric[]>()
          metricsData.forEach(m => {
            const key = `${m.method} ${m.endpoint}`
            if (!endpointMap.has(key)) {
              endpointMap.set(key, [])
            }
            endpointMap.get(key)!.push(m)
          })

          const statsArray: EndpointStats[] = []
          endpointMap.forEach((metrics, key) => {
            const [method, endpoint] = key.split(' ')
            const times = metrics.map(m => m.response_time as number).sort((a, b) => a - b)
            const avg = times.reduce((a, b) => a + b, 0) / times.length
            const p95Index = Math.floor(times.length * 0.95)

            let status: 'fast' | 'slow' | 'critical' = 'fast'
            if (avg > 3000) status = 'critical'
            else if (avg > 1000) status = 'slow'

            statsArray.push({
              endpoint,
              method,
              avg: Math.round(avg),
              min: times[0],
              max: times[times.length - 1],
              count: times.length,
              p95: times[p95Index],
              status,
            })
          })

          // Sort by slowest average
          statsArray.sort((a, b) => b.avg - a.avg)
          setStats(statsArray)
        }
      } catch (err) {
        console.error('[performance] fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [timeRange])

  const statusColor = {
    fast: 'text-green-600',
    slow: 'text-yellow-600',
    critical: 'text-red-600',
  }

  const statusBg = {
    fast: 'bg-green-900',
    slow: 'bg-yellow-900',
    critical: 'bg-red-900',
  }

  const avgResponseTime = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + (m.response_time as number), 0) / metrics.length)
    : 0

  const slowEndpoints = stats.filter(s => s.status !== 'fast').length

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Performance Metrics</h1>
              <p className="text-gray-400 mt-2">API response time tracking and analysis</p>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="mb-8 flex gap-4">
          {(['1h', '24h', '7d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded text-sm font-bold ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {range === '1h' ? 'Last Hour' : range === '24h' ? 'Last 24h' : 'Last 7 days'}
            </button>
          ))}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Avg Response Time</p>
            <p className="text-2xl font-bold">{avgResponseTime}ms</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Requests</p>
            <p className="text-2xl font-bold">{metrics.length}</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Endpoints Tracked</p>
            <p className="text-2xl font-bold">{stats.length}</p>
          </div>
          <div className={`${statusBg[slowEndpoints > 0 ? 'slow' : 'fast']} border border-gray-700 rounded-lg p-4`}>
            <p className="text-gray-300 text-sm">Slow Endpoints</p>
            <p className="text-2xl font-bold">{slowEndpoints}</p>
          </div>
        </div>

        {/* Endpoint Stats Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Endpoint Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4">Endpoint</th>
                  <th className="text-center py-3 px-4">Count</th>
                  <th className="text-center py-3 px-4">Avg</th>
                  <th className="text-center py-3 px-4">Min</th>
                  <th className="text-center py-3 px-4">Max</th>
                  <th className="text-center py-3 px-4">p95</th>
                  <th className="text-center py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      Loading...
                    </td>
                  </tr>
                ) : stats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      No metrics collected yet
                    </td>
                  </tr>
                ) : (
                  stats.map(stat => (
                    <tr key={`${stat.method}-${stat.endpoint}`} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="py-3 px-4">
                        <code className="text-xs font-mono">
                          {stat.method} {stat.endpoint}
                        </code>
                      </td>
                      <td className="py-3 px-4 text-center">{stat.count}</td>
                      <td className="py-3 px-4 text-center font-bold">{stat.avg}ms</td>
                      <td className="py-3 px-4 text-center text-green-400">{stat.min}ms</td>
                      <td className="py-3 px-4 text-center text-red-400">{stat.max}ms</td>
                      <td className="py-3 px-4 text-center text-yellow-400">{stat.p95}ms</td>
                      <td className={`py-3 px-4 text-center font-bold ${statusColor[stat.status]}`}>
                        {stat.status.toUpperCase()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Metrics */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Recent Requests</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {metrics.slice(0, 50).map((metric, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 px-4 bg-gray-700 rounded text-sm">
                <div className="font-mono">
                  {metric.method} {metric.endpoint}
                </div>
                <div className="flex items-center gap-4">
                  <span className={metric.response_time > 1000 ? 'text-red-400' : 'text-green-400'}>
                    {metric.response_time}ms
                  </span>
                  <span className="text-gray-400">
                    {new Date(metric.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 justify-end">
          <Link
            href="/admin/status"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
          >
            System Status
          </Link>
          <Link
            href="/admin/errors"
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
          >
            Error Logs
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
