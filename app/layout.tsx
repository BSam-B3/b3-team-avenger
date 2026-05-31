import type { Metadata } from 'next'
import './globals.css'
import VoiceButtonWrapper from './components/VoiceButtonWrapper'

export const metadata: Metadata = {
  title: 'B3 Team Avenger',
  description: 'AI Agent Command Center — 9CJ Corp',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        {children}
        <VoiceButtonWrapper />
      </body>
    </html>
  )
}
