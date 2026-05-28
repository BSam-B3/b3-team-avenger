/**
 * GET /api/workers/idle-check
 * Runs via Vercel Cron every hour
 * If no activity for X hours → send Telegram summary + open Autonomy mode
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/notify/telegram'
import { callAITracked } from '@/lib/ai/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Check last activity
  const { data: lastLog } = await supabase
    .from('agent_logs')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Get idle threshold (default 3h)
  const { data: setting } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'b3_idle_hours')
    .single()

  const idleHours = Number(setting?.setting_value ?? 3)
  const lastActivity = lastLog?.created_at ? new Date(lastLog.created_at) : new Date(0)
  const hoursSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60)

  if (hoursSinceActivity < idleHours) {
    return NextResponse.json({ ok: true, idle: false, hours: hoursSinceActivity.toFixed(1) })
  }

  // System has been idle — generate an interesting update for B3
  try {
    const { data: recentTasks } = await supabase
      .from('agent_tasks')
      .select('task_detail, assigned_to, status')
      .order('created_at', { ascending: false })
      .limit(5)

    const taskSummary = (recentTasks ?? [])
      .map((t: { assigned_to: string; task_detail: string; status: string }) => `- ${t.assigned_to}: ${t.task_detail.slice(0, 50)} [${t.status}]`)
      .join('\n') || 'ยังไม่มี task'

    const msg = await callAITracked(
      {
        system: `คุณคือ IDLE-TIME CURIOSITY DRIVE ของทีม B3 Team Avenger\nระบบว่างมา ${hoursSinceActivity.toFixed(1)} ชั่วโมง\n\nเขียนข้อความสั้นๆ ถึงคุณบีสาม (ภาษาไทย 2-3 ประโยค) แจ้งว่า:\n- ทีมพักอยู่ ${hoursSinceActivity.toFixed(0)} ชั่วโมงแล้ว\n- งานล่าสุดที่ทำ\n- เสนอสิ่งที่น่าสนใจ 1 อย่าง (ไอเดีย, เคล็ดลับ, หรือคำถามที่ควรคิด)\nห้ามทำแบบ template พูดตรงๆ สั้นๆ`,
        userMessage: `Last tasks:\n${taskSummary}`,
        maxTokens: 200,
      },
      'IdleBot',
      undefined,
    )

    const telegramMsg = `🤖 <b>B3 Team Avenger</b>\n\n${msg}`
    await sendTelegram(telegramMsg)

    await supabase.from('agent_logs').insert({
      agent_name:  'IdleBot',
      action_desc: `💤 Idle ${hoursSinceActivity.toFixed(0)}h — ส่ง Telegram แล้ว`,
      status:      'completed',
    })
  } catch { /* notification non-critical */ }

  return NextResponse.json({ ok: true, idle: true, hours: hoursSinceActivity.toFixed(1) })
}
