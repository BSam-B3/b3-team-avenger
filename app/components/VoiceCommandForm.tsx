'use client'

import { useState, useRef, useEffect } from 'react'

interface VoiceCommandFormProps {
  onSuccess?: (commandId: string, intent: string) => void
}

export default function VoiceCommandForm({ onSuccess }: VoiceCommandFormProps) {
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string>()
  const [lastCommand, setLastCommand] = useState<{ id: string; intent: string }>()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        // In production, send to Gemini or speech-to-text service
        // For now, use placeholder transcript
        setTranscript(`[Audio captured - ${audioBlob.size} bytes]`)
      }

      mediaRecorder.start()
      setRecording(true)
      setError(undefined)
    } catch (err) {
      setError('Unable to access microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      setRecording(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transcript) {
      setError('Please enter or record a command')
      return
    }

    setLoading(true)
    setError(undefined)

    try {
      const response = await fetch('/api/mobile/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          userId: 'web-user',
          apiKey: process.env.NEXT_PUBLIC_MOBILE_API_KEY || 'test-key',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to process command')
      }

      const data = await response.json()
      setLastCommand({ id: data.data.commandId, intent: data.data.intent })
      setTranscript('')
      onSuccess?.(data.data.commandId, data.data.intent)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const intentEmoji = {
    'create-ticket': '🎫',
    'create-quotation': '💼',
    'check-email': '📧',
    'fetch-brief': '☀️',
    'check-status': '📊',
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <h2>🎤 Voice Command</h2>

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

      {lastCommand && (
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
          {intentEmoji[lastCommand.intent as keyof typeof intentEmoji] || '🎤'} Command: {lastCommand.intent}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
            Command Text
          </label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="E.g., 'create a ticket for issue 123' or 'generate quotation for ACME Corp'"
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          {!recording ? (
            <button
              type="button"
              onClick={startRecording}
              style={{
                flex: 1,
                padding: '10px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              🎙️ Start Recording
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              style={{
                flex: 1,
                padding: '10px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                animation: 'pulse 2s infinite',
              }}
            >
              ⏹️ Stop Recording
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !transcript}
          style={{
            width: '100%',
            padding: '12px',
            background: loading || !transcript ? '#d1d5db' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: loading || !transcript ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳ Processing...' : '✓ Execute Command'}
        </button>
      </form>

      <div style={{ marginTop: '20px', padding: '15px', background: '#fef3c7', borderRadius: '6px', fontSize: '12px', color: '#78350f' }}>
        <strong>💡 Supported commands:</strong>
        <ul style={{ margin: '8px 0 0 20px' }}>
          <li>Create ticket / issue</li>
          <li>Create / generate quotation</li>
          <li>Check email / unread</li>
          <li>Fetch brief / morning summary</li>
          <li>Check status / progress</li>
        </ul>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
