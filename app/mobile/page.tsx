'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface VoiceCommand {
  id: string
  transcript: string
  intent: string
  status: 'pending' | 'success' | 'failed' | 'confirmed'
  created_at: string
}

export default function MobilePage() {
  const [commands, setCommands] = useState<VoiceCommand[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchCommands()
    const interval = setInterval(fetchCommands, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchCommands() {
    try {
      const { data } = await supabase
        .from('voice_commands')
        .select('*, voice_results(status)')
        .order('created_at', { ascending: false })
        .limit(20)

      const formatted = data?.map((d: any) => ({
        id: d.id,
        transcript: d.transcript,
        intent: d.intent,
        status: d.voice_results?.[0]?.status || 'pending',
        created_at: d.created_at,
      })) || []

      setCommands(formatted)
    } catch (err) {
      console.error('[mobile] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const statusEmoji = {
    pending: '⏳',
    success: '✅',
    failed: '❌',
    confirmed: '👤',
  }

  const intentEmoji: Record<string, string> = {
    'create-ticket': '🎫',
    'create-quotation': '💼',
    'check-email': '📧',
    'fetch-brief': '☀️',
    'check-status': '📊',
    unknown: '❓',
  }

  return (
    <div style={{ padding: '20px', background: '#0d1117', minHeight: '100vh', color: '#f0f6fc' }}>
      <h1 style={{ marginBottom: '30px' }}>🎤 Voice Commands</h1>

      {loading ? (
        <p>Loading...</p>
      ) : commands.length === 0 ? (
        <p style={{ color: '#4b5563' }}>No voice commands yet</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {commands.map((cmd) => (
            <div
              key={cmd.id}
              style={{
                background: '#161b22',
                border: '1px solid #30363d',
                padding: '12px',
                borderRadius: '6px',
                borderLeft: '3px solid #60a5fa',
              }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '18px', minWidth: '25px' }}>
                  {intentEmoji[cmd.intent] || '🎤'}
                </span>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
                    {cmd.intent}
                  </div>
                  <div style={{ fontSize: '11px', color: '#4b5563' }}>
                    "{cmd.transcript.substring(0, 60)}..."
                  </div>
                </div>

                <div style={{ fontSize: '16px', minWidth: '25px', textAlign: 'center' }}>
                  {statusEmoji[cmd.status]}
                </div>
              </div>

              <div style={{ fontSize: '9px', color: '#4b5563', marginTop: '8px' }}>
                {new Date(cmd.created_at).toLocaleTimeString('th-TH')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
