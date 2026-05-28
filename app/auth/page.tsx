'use client'

/**
 * /auth — หน้าเชื่อมต่อ Email providers
 * ใช้ครั้งแรกเพื่อ authorize Gmail + Microsoft 365
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface EmailStatus {
  gmail: { connected: boolean; email?: string }
  m365:  { connected: boolean; email?: string }
}

function AuthPageContent() {
  const [status, setStatus]   = useState<EmailStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()

  const successProvider = searchParams.get('success')
  const errorProvider   = searchParams.get('error')

  useEffect(() => {
    fetch('/api/email?limit=0')
      .then(r => r.json())
      .then(d => { setStatus(d.status); setLoading(false) })
      .catch(() => setLoading(false))
  }, [successProvider])

  return (
    <div style={{
      background: '#030712', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '20px',
      fontFamily: 'system-ui, sans-serif', color: '#fff',
    }}>
      {/* Top bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: '12px 20px',
        display: 'flex', gap: 10, alignItems: 'center',
        background: 'rgba(3,7,18,0.9)', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Link href="/dashboard" style={{ fontSize: 11, color: '#64748b', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
        <span style={{ color: '#1e293b' }}>│</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>🔌 เชื่อมต่อ Email</span>
      </div>

      <div style={{ width: '100%', maxWidth: 480, marginTop: 60 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>📬</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f0f6fc', margin: 0 }}>
            Email Integration
          </h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 8 }}>
            เชื่อมต่อ Email เพื่อให้ Agent อ่านและสรุปให้ได้จริง
          </p>
        </div>

        {/* Success / Error banner */}
        {successProvider && (
          <div style={{
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 8, padding: '10px 16px', marginBottom: 20,
            fontSize: 13, color: '#4ade80', textAlign: 'center',
          }}>
            ✅ เชื่อมต่อ {successProvider === 'gmail' ? 'Gmail' : 'Microsoft 365'} สำเร็จแล้ว!
          </div>
        )}
        {errorProvider && (
          <div style={{
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 8, padding: '10px 16px', marginBottom: 20,
            fontSize: 13, color: '#f87171', textAlign: 'center',
          }}>
            ❌ เกิดข้อผิดพลาด ลองใหม่อีกครั้ง
          </div>
        )}

        {/* Gmail Card */}
        <ProviderCard
          icon="📧"
          name="Gmail"
          email={status?.gmail.email}
          connected={status?.gmail.connected ?? false}
          loading={loading}
          connectHref="/api/auth/gmail"
          color="#34d399"
          description="surapong3331@gmail.com"
        />

        {/* M365 Card */}
        <ProviderCard
          icon="📨"
          name="Microsoft 365"
          email={status?.m365.email}
          connected={status?.m365.connected ?? false}
          loading={loading}
          connectHref="/api/auth/m365"
          color="#60a5fa"
          description="surapong.wee@pandvhappyness.onmicrosoft.com"
        />

        {/* Test button */}
        {(status?.gmail.connected || status?.m365.connected) && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <a
              href="/api/email?limit=5"
              target="_blank"
              style={{
                display: 'inline-block',
                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                color: '#f59e0b', borderRadius: 8, padding: '8px 24px',
                textDecoration: 'none', fontSize: 12, fontWeight: 600,
              }}
            >
              🧪 ทดสอบดึง Email
            </a>
          </div>
        )}

        {/* Info */}
        <div style={{
          marginTop: 32, padding: '14px 16px',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, fontSize: 11, color: '#475569', lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 700, color: '#64748b', marginBottom: 6 }}>ℹ️ หมายเหตุ</div>
          <div>• เชื่อมต่อครั้งเดียว — token ถูกเก็บใน Supabase อัตโนมัติ</div>
          <div>• Agent จะอ่านได้เฉพาะ metadata + preview (ไม่อ่านเนื้อหาเต็ม)</div>
          <div>• สิทธิ์: <strong>Read Only</strong> — ไม่สามารถส่งหรือลบ email ได้</div>
          <div>• Revoke ได้ตลอดเวลาจาก Google Account / Microsoft Account</div>
        </div>

      </div>
    </div>
  )
}

function ProviderCard({ icon, name, email, connected, loading, connectHref, color, description }: {
  icon: string; name: string; email?: string; connected: boolean
  loading: boolean; connectHref: string; color: string; description: string
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${connected ? color + '44' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 12, padding: '16px 20px',
      marginBottom: 12, display: 'flex',
      alignItems: 'center', gap: 16,
    }}>
      <div style={{ fontSize: 32, flexShrink: 0 }}>{icon}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f6fc' }}>{name}</div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
          {connected && email ? email : description}
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        {loading ? (
          <span style={{ fontSize: 11, color: '#475569' }}>⏳</span>
        ) : connected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{
              background: `${color}22`, border: `1px solid ${color}44`,
              color, borderRadius: 20, padding: '2px 10px',
              fontSize: 10, fontWeight: 700,
            }}>✓ Connected</span>
            <a href={connectHref} style={{
              fontSize: 9, color: '#475569', textDecoration: 'none',
            }}>Reconnect</a>
          </div>
        ) : (
          <a href={connectHref} style={{
            display: 'inline-block',
            background: `${color}18`, border: `1px solid ${color}44`,
            color, borderRadius: 8, padding: '6px 16px',
            textDecoration: 'none', fontSize: 11, fontWeight: 700,
            transition: 'all 0.15s',
          }}>
            Connect →
          </a>
        )}
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageContent />
    </Suspense>
  )
}
