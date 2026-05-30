#!/usr/bin/env node

/**
 * 🔄 Proxy Agent Messenger
 * Orchestrates Claude ↔ Gemini document processing loop
 *
 * Usage:
 *   node proxy-messenger.js <source.md> <target.md> "คำสั่งให้เจม"
 *
 * Example:
 *   node proxy-messenger.js ./raw/input.md ./wiki/output.md "เก็บเอกสารนี้ให้สะอาดตามโครงสร้าง wiki"
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') })

// ─── CONFIG ─────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash'
const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

if (!GEMINI_API_KEY) {
  console.error('❌ ไม่พบ GEMINI_API_KEY ในไฟล์ .env.local')
  process.exit(1)
}

/**
 * Call Gemini API
 */
async function callGeminiAPI(prompt) {
  return new Promise((resolve, reject) => {
    const url = `${API_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

    const payload = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    })

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', chunk => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content) {
            const text = parsed.candidates[0].content.parts[0].text
            resolve(text)
          } else {
            reject(new Error('Invalid response format from Gemini'))
          }
        } catch (err) {
          reject(err)
        }
      })
    })

    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

/**
 * Main orchestration loop
 */
async function runProxyOrchestration(sourceFilePath, targetFilePath, instructions) {
  try {
    console.log(`\n🤖 [Proxy] เริ่มอ่านไฟล์ต้นทาง -> ${path.basename(sourceFilePath)}`)

    // ─── 1. Read source file ───────────────────────────────────────────
    if (!fs.existsSync(sourceFilePath)) {
      throw new Error(`ไม่พบไฟล์: ${sourceFilePath}`)
    }

    const fileContent = fs.readFileSync(sourceFilePath, 'utf-8')
    console.log(`📄 อ่านไฟล์สำเร็จ (${fileContent.length} bytes)`)

    // ─── 2. Build prompt for Gemini ─────────────────────────────────────
    const masterPrompt = `คุณคือ GEM (เจม) ผู้ปรึกษาเชิงกลยุทธ์ของ B3

ได้รับภารกิจจาก Claude Code (ผู้บัญชาการ):

[📋 คำสั่งปฏิบัติการ]:
${instructions}

[📄 เนื้อหาไฟล์เอกสาร]:
---
${fileContent}
---

[⚡ ระบบปฏิบัติการ]:
1. ประมวลผลตามคำสั่งข้างต้น
2. ส่งผลลัพธ์เป็นเอกสาร .md ที่ปรับปรุงสิ้นสุดแล้ว
3. ห้ามอธิบายเพิ่มเติม แค่ผลลัพธ์เท่านั้น

ผลลัพธ์:`

    // ─── 3. Send to Gemini ──────────────────────────────────────────────
    console.log(`🧠 [Proxy] ส่งข้อมูลไป Gemini API...`)
    const updatedContent = await callGeminiAPI(masterPrompt)
    console.log(`✅ [Proxy] ได้คำตอบจากเจม (${updatedContent.length} bytes)`)

    // ─── 4. Write result ────────────────────────────────────────────────
    console.log(`💾 [Proxy] บันทึกลงไฟล์เป้าหมาย -> ${path.basename(targetFilePath)}`)
    fs.writeFileSync(targetFilePath, updatedContent, 'utf-8')

    console.log(`✅ [Proxy] ลูป Proxy ปิดสิ้นสุด! ไฟล์อัปเดตเสร็จ\n`)

  } catch (error) {
    console.error(`\n❌ [Proxy Error]: ${error.message}\n`)
    process.exit(1)
  }
}

// ─── CLI ENTRY POINT ────────────────────────────────────────────────────
const [, , src, dest, ...instArray] = process.argv
const instructions = instArray.join(' ')

if (src && dest && instructions) {
  runProxyOrchestration(
    path.resolve(src),
    path.resolve(dest),
    instructions
  )
} else {
  console.log(`
💡 [Usage]:
  node proxy-messenger.js <source.md> <target.md> "คำสั่งให้เจม"

📌 [ตัวอย่าง]:
  node proxy-messenger.js ./raw/article.md ./wiki/summary.md "สรุปบทความเป็น 3 จุดหลัก"
`)
}
