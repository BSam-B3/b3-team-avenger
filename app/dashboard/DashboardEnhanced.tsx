'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import QuotationForm from '@/app/components/QuotationForm'
import VoiceCommandForm from '@/app/components/VoiceCommandForm'

interface DashboardStats {
  totalQuotations: number
  pendingApprovals: number
  voiceCommands: number
  checklists: number
  completedToday: number
}

export default function DashboardEnhanced() {
  const [activeTab, setActiveTab] = useState<'overview' | 'quotation' | 'voice' | 'checklist'>('overview')
  const [stats, setStats] = useState<DashboardStats>({
    totalQuotations: 0,
    pendingApprovals: 0,
    voiceCommands: 0,
    checklists: 0,
    completedToday: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  async function fetchStats() {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Get quotation stats
      const { count: totalQuotes } = await supabase
        .from('quotation_drafts')
        .select('*', { count: 'exact', head: true })

      const { count: pendingQuotes } = await supabase
        .from('quotation_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval')

      // Get voice commands
      const { count: voiceCount } = await supabase
        .from('voice_commands')
        .select('*', { count: 'exact', head: true })

      // Get checklists
      const { count: checklistCount } = await supabase
        .from('onsite_checklists')
        .select('*', { count: 'exact', head: true })

      const { count: completedCount } = await supabase
        .from('onsite_checklists')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', today)

      setStats({
        totalQuotations: totalQuotes || 0,
        pendingApprovals: pendingQuotes || 0,
        voiceCommands: voiceCount || 0,
        checklists: checklistCount || 0,
        completedToday: completedCount || 0,
      })
    } catch (err) {
      console.error('[dashboard] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ icon, label, value, color }: any) => (
    <div
      style={{
        background: '#161b22',
        border: '1px solid #30363d',
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color }}>{value}</div>
    </div>
  )

  const TabButton = ({ id, label, icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '12px 16px',
        background: activeTab === id ? '#3b82f6' : '#30363d',
        color: '#f0f6fc',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: activeTab === id ? 'bold' : 'normal',
        transition: 'all 0.2s',
      }}
    >
      {icon} {label}
    </button>
  )

  return (
    <div style={{ padding: '20px', background: '#0d1117', minHeight: '100vh', color: '#f0f6fc' }}>
      <h1 style={{ marginBottom: '30px' }}>📊 B3 Avenger Dashboard</h1>

      {/* Stats Overview */}
      {activeTab === 'overview' && (
        <div>
          <h2 style={{ marginBottom: '20px' }}>📈 System Status</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
              marginBottom: '30px',
            }}
          >
            <StatCard icon="💼" label="Total Quotations" value={stats.totalQuotations} color="#60a5fa" />
            <StatCard icon="⏳" label="Pending Approval" value={stats.pendingApprovals} color="#f59e0b" />
            <StatCard icon="🎤" label="Voice Commands" value={stats.voiceCommands} color="#ec4899" />
            <StatCard icon="🔧" label="Active Checklists" value={stats.checklists} color="#10b981" />
            <StatCard icon="✅" label="Completed Today" value={stats.completedToday} color="#22c55e" />
          </div>

          <h2 style={{ marginBottom: '20px' }}>⚡ Recent Activity</h2>
          <div
            style={{
              background: '#161b22',
              border: '1px solid #30363d',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#4b5563',
            }}
          >
            Real-time activity will appear here
          </div>
        </div>
      )}

      {/* Tabs */}
      {activeTab !== 'overview' && (
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '15px' }}>Create New</h2>
        </div>
      )}

      {activeTab === 'quotation' && <QuotationForm onSuccess={fetchStats} />}
      {activeTab === 'voice' && <VoiceCommandForm onSuccess={fetchStats} />}

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginTop: '40px',
          flexWrap: 'wrap',
          borderTop: '1px solid #30363d',
          paddingTop: '20px',
        }}
      >
        <TabButton id="overview" label="Overview" icon="📊" />
        <TabButton id="quotation" label="New Quotation" icon="💼" />
        <TabButton id="voice" label="Voice Command" icon="🎤" />
        <TabButton id="checklist" label="Checklist" icon="🔧" />
      </div>

      {/* Footer Navigation */}
      <div
        style={{
          marginTop: '40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px',
          padding: '20px 0',
          borderTop: '1px solid #30363d',
        }}
      >
        <a href="/quotation" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '14px' }}>
          → View all quotations
        </a>
        <a href="/mobile" style={{ color: '#ec4899', textDecoration: 'none', fontSize: '14px' }}>
          → Voice command history
        </a>
        <a href="/jarvis" style={{ color: '#10b981', textDecoration: 'none', fontSize: '14px' }}>
          → Checklist progress
        </a>
      </div>
    </div>
  )
}
