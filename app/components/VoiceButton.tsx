'use client'

import { useState, useRef, useEffect } from 'react'
import { parseVoiceCommand, executeVoiceIntent } from '@/lib/voice/voiceParser'

interface VoiceButtonProps {
  userId?: string
  apiKey?: string
  onTranscript?: (text: string) => void
  onIntent?: (intent: string, payload: any) => void
  onError?: (error: string) => void
}

const VoiceButton = ({
  userId = 'web-user',
  apiKey = process.env.NEXT_PUBLIC_MOBILE_API_KEY || 'test-key',
  onTranscript,
  onIntent,
  onError,
}: VoiceButtonProps) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastIntent, setLastIntent] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition

    if (!SpeechRecognition) {
      onError?.('Web Speech API not supported in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'th-TH' // Default Thai, can switch to 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          setTranscript((prev) => prev + transcript)
        } else {
          interimTranscript += transcript
        }
      }
      onTranscript?.(transcript + interimTranscript)
    }

    recognition.onerror = (event: any) => {
      onError?.(`Voice recognition error: ${event.error}`)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
  }, [onTranscript, onError])

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('')
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  const handleExecute = async () => {
    if (!transcript.trim()) {
      onError?.('Please speak a command first')
      return
    }

    setIsProcessing(true)

    try {
      const parsedIntent = parseVoiceCommand(transcript)
      setLastIntent(parsedIntent.intent)
      onIntent?.(parsedIntent.intent, parsedIntent.payload)

      // Execute the intent
      const result = await executeVoiceIntent(parsedIntent, userId, apiKey)
      setTranscript('')
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to execute command')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 50,
      }}
    >
      {/* Floating Voice Button */}
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={isProcessing}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: 'none',
          background: isListening ? '#dc2626' : '#ff9900',
          color: 'white',
          fontSize: '24px',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.3s ease',
          opacity: isProcessing ? 0.7 : 1,
        }}
        title={isListening ? 'Stop recording' : 'Start recording'}
      >
        {isListening ? '⏹️' : '🎤'}
      </button>

      {/* Transcript Display */}
      {transcript && (
        <div
          style={{
            position: 'absolute',
            bottom: '85px',
            right: '0',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '12px',
            maxWidth: '300px',
            fontSize: '13px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <strong>You said:</strong>
          <p style={{ margin: '8px 0 0 0', color: '#666' }}>{transcript}</p>

          {/* Execute Button */}
          <button
            onClick={handleExecute}
            disabled={isProcessing}
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '8px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.7 : 1,
            }}
          >
            {isProcessing ? '⏳ Executing...' : '✓ Execute'}
          </button>
        </div>
      )}

      {/* Intent Badge */}
      {lastIntent && lastIntent !== 'UNKNOWN' && (
        <div
          style={{
            position: 'absolute',
            bottom: '85px',
            right: '0',
            background: '#d1fae5',
            border: '1px solid #6ee7b7',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '12px',
            color: '#065f46',
            whiteSpace: 'nowrap',
          }}
        >
          ✓ {lastIntent}
        </div>
      )}
    </div>
  )
}

export default VoiceButton
