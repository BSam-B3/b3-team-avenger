/**
 * lib/notify/telegram.ts
 * Send Telegram message to B3 via bot
 * Token + chat_id stored in Supabase app_settings
 */

import { createClient } from '@supabase/supabase-js'

let cachedToken: string | null = null
let cachedChatId: string | null = null

async function getTelegramConfig(): Promise<{ token: string; chatId: string } | null> {
  if (cachedToken && cachedChatId) return { token: cachedToken, chatId: cachedChatId }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['b3_telegram_token', 'b3_telegram_chat_id'])

    const map: Record<string, string> = {}
    for (const row of data ?? []) {
      map[row.setting_key as string] = String(row.setting_value ?? '').replace(/^"|"$/g, '')
    }

    if (!map['b3_telegram_token'] || !map['b3_telegram_chat_id']) return null
    cachedToken  = map['b3_telegram_token']
    cachedChatId = map['b3_telegram_chat_id']
    return { token: cachedToken, chatId: cachedChatId }
  } catch {
    return null
  }
}

export async function sendTelegram(message: string): Promise<boolean> {
  const config = await getTelegramConfig()
  if (!config) return false

  try {
    const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text:    message,
        parse_mode: 'HTML',
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

// Reset cache when settings change
export function clearTelegramCache() {
  cachedToken  = null
  cachedChatId = null
}
