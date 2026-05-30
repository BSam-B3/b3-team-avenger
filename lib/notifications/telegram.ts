// Telegram notifications with optional buttons
export interface TelegramButton {
  text: string
  callback_data: string
}

export interface TelegramMessage {
  chat_id: string
  text: string
  buttons?: TelegramButton[][]
  parse_mode?: 'HTML' | 'Markdown'
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`

export async function sendTelegramMessage(message: TelegramMessage): Promise<void> {
  if (!BOT_TOKEN) {
    console.warn('[telegram] BOT_TOKEN not set, skipping notification')
    return
  }

  try {
    const payload: any = {
      chat_id: message.chat_id,
      text: message.text,
      parse_mode: message.parse_mode || 'HTML',
    }

    if (message.buttons?.length) {
      payload.reply_markup = {
        inline_keyboard: message.buttons,
      }
    }

    const response = await fetch(`${API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`)
    }
  } catch (err) {
    console.error('[telegram] send failed:', err)
  }
}

// Common notification types
export async function sendQuotationApprovalRequest(
  chatId: string,
  customerName: string,
  total: number,
  quotationId: string
): Promise<void> {
  await sendTelegramMessage({
    chat_id: chatId,
    text: `<b>📝 New Quotation</b>\n\nCustomer: ${customerName}\nAmount: ฿${total.toLocaleString('th-TH')}\n\nApprove or reject?`,
    buttons: [
      [
        { text: '✅ Approve', callback_data: `approve_quote:${quotationId}` },
        { text: '❌ Reject', callback_data: `reject_quote:${quotationId}` },
      ],
    ],
  })
}

export async function sendVoiceCommandAlert(
  chatId: string,
  intent: string,
  transcript: string,
  commandId: string
): Promise<void> {
  const intentEmoji = {
    'create-ticket': '🎫',
    'create-quotation': '💼',
    'check-email': '📧',
    'fetch-brief': '☀️',
    'check-status': '📊',
  }

  await sendTelegramMessage({
    chat_id: chatId,
    text: `${intentEmoji[intent as keyof typeof intentEmoji] || '🎤'} <b>Voice Command</b>\n\n<code>${transcript.substring(0, 50)}...</code>\n\nNeed approval?`,
    buttons: [
      [{ text: '✅ Confirm', callback_data: `confirm_voice:${commandId}` }],
      [{ text: '❌ Cancel', callback_data: `cancel_voice:${commandId}` }],
    ],
  })
}

export async function sendChecklistNotification(
  chatId: string,
  customerName: string,
  progress: number,
  checklistId: string
): Promise<void> {
  await sendTelegramMessage({
    chat_id: chatId,
    text: `<b>🔧 Checklist Update</b>\n\nCustomer: ${customerName}\nProgress: ${progress}%\n\nView details or mark complete.`,
    buttons: [
      [{ text: '📋 View', callback_data: `view_checklist:${checklistId}` }],
      [{ text: '✅ Complete', callback_data: `complete_checklist:${checklistId}` }],
    ],
  })
}
