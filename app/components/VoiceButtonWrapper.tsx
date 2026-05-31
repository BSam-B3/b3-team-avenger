'use client'

import VoiceButton from './VoiceButton'

export default function VoiceButtonWrapper() {
  return (
    <VoiceButton
      userId="web-user"
      onError={(e) => console.error('Voice error:', e)}
    />
  )
}
