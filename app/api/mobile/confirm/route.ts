/**
 * POST /api/mobile/confirm
 *
 * Confirm voice command execution (for creation/modification commands)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/notify/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface ConfirmRequest {
  resultId: string
  approved: boolean
}

export async function POST(req: NextRequest) {
  try {
    const body: ConfirmRequest = await req.json()
    const { resultId, approved } = body

    if (!resultId) {
      return NextResponse.json({ error: 'resultId required' }, { status: 400 })
    }

    // ─── Fetch result + command ────────────────────────────────────────────
    const { data: result } = await supabase
      .from('voice_results')
      .select('*, voice_commands(*)')
      .eq('id', resultId)
      .single()

    if (!result) {
      return NextResponse.json({ error: 'result not found' }, { status: 404 })
    }

    const command = result.voice_commands

    // ─── Update status ────────────────────────────────────────────────────
    await supabase
      .from('voice_results')
      .update({ status: approved ? 'success' : 'failed' })
      .eq('id', resultId)

    // ─── Telegram confirmation ────────────────────────────────────────────
    const icon = approved ? '✅' : '❌'
    void sendTelegram(
      `${icon} Voice command confirmed\n` +
      `🎤 ${command.intent}\n` +
      `${result.action_taken}`
    )

    return NextResponse.json({
      ok: true,
      resultId,
      status: approved ? 'success' : 'failed',
    })
  } catch (err) {
    console.error('[mobile/confirm error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
