#!/usr/bin/env node

/**
 * delegate-to-gemini.js
 *
 * Claude วิเคราะห์งาน → แบ่งงาน → โยนส่วน docs/analysis ให้ Gemini ทันที
 *
 * Usage:
 *   node delegate-to-gemini.js "คำสั่งจาก B3"
 *
 * Gemini จะได้รับ:
 *   - context ของโปรเจค
 *   - งานที่ต้องทำ
 *   - เขียนผลลัพธ์กลับไปที่ไฟล์ output
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

// Load .env.local manually (no dotenv dependency)
const envFile = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  })
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash'

if (!GEMINI_API_KEY) {
  console.error('❌ ไม่พบ GEMINI_API_KEY')
  process.exit(1)
}

// Task types ที่ Gemini เหมาะ
const GEMINI_TASKS = [
  { keyword: ['วิเคราะห์', 'analyze', 'analysis'], type: 'analysis' },
  { keyword: ['สรุป', 'summarize', 'summary'], type: 'summary' },
  { keyword: ['เอกสาร', 'document', 'wiki', 'md'], type: 'docs' },
  { keyword: ['คลังความรู้', 'knowledge', 'knowledge base'], type: 'knowledge' },
  { keyword: ['ออกแบบ', 'design', 'schema', 'architect'], type: 'design' },
  { keyword: ['แปล', 'translate', 'translation'], type: 'translation' },
]

function detectTaskType(command) {
  const lower = command.toLowerCase()
  for (const t of GEMINI_TASKS) {
    if (t.keyword.some(k => lower.includes(k))) return t.type
  }
  return 'general'
}

async function callGemini(prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
    })

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }

    const req = https.request(options, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) resolve(text)
          else reject(new Error('No response text: ' + JSON.stringify(parsed).slice(0, 200)))
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

async function main() {
  const command = process.argv.slice(2).join(' ')
  if (!command) {
    console.log('Usage: node delegate-to-gemini.js "คำสั่ง"')
    console.log('Example: node delegate-to-gemini.js "สรุป IT Request ที่ค้างอยู่ทั้งหมด"')
    process.exit(0)
  }

  const taskType = detectTaskType(command)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outputFile = path.join(__dirname, `../logs/gemini-${taskType}-${timestamp}.md`)

  // สร้าง logs dir ถ้าไม่มี
  fs.mkdirSync(path.join(__dirname, '../logs'), { recursive: true })

  console.log(`\n🤖 [Claude] วิเคราะห์งาน: "${command}"`)
  console.log(`📋 [Claude] Task type: ${taskType}`)
  console.log(`📤 [Claude] ส่งต่อให้ Gemini...`)

  // อ่าน context ที่เกี่ยวข้อง
  let context = ''
  const contextFiles = [
    '../../../B3-Second-Brain/wiki/project-status-auto.md',
    '../../../B3-Second-Brain/wiki/knowledge-base.md',
  ]
  for (const f of contextFiles) {
    const fp = path.resolve(__dirname, f)
    if (fs.existsSync(fp)) {
      context += `\n--- ${path.basename(f)} ---\n` + fs.readFileSync(fp, 'utf-8').slice(0, 2000) + '\n'
    }
  }

  const prompt = `คุณคือ Gemini ผู้เชี่ยวชาญด้านการวิเคราะห์และเอกสาร
ได้รับมอบหมายจาก Claude Code (ผู้บัญชาการ) ให้ทำงานต่อไปนี้

[คำสั่ง]: ${command}
[Task Type]: ${taskType}

[Context จากระบบ]:
${context || '(ไม่มี context เพิ่มเติม)'}

[กฎการทำงาน]:
1. ตอบเป็นภาษาไทย (ยกเว้นศัพท์เทคนิค)
2. ผลลัพธ์ต้องเป็น Markdown ที่ใช้งานได้ทันที
3. ไม่ต้องอธิบายว่าจะทำอะไร แค่ทำเลย
4. ห้ามยาวเกิน 2000 คำ

ผลลัพธ์:`

  try {
    const result = await callGemini(prompt)

    // บันทึกผลลัพธ์
    const output = `# Gemini Output: ${command}\n\n**Task Type:** ${taskType}  \n**Generated:** ${new Date().toLocaleString('th-TH')}  \n**Delegated by:** Claude Code\n\n---\n\n${result}`
    fs.writeFileSync(outputFile, output, 'utf-8')

    console.log(`\n✅ [Gemini] เสร็จแล้ว!`)
    console.log(`💾 [Claude] บันทึกผลลัพธ์ → ${outputFile}`)
    console.log(`\n--- ผลลัพธ์ ---`)
    console.log(result.slice(0, 500) + (result.length > 500 ? '\n...(ดูเพิ่มเติมในไฟล์)' : ''))

    return outputFile
  } catch (err) {
    console.error(`❌ [Gemini Error]: ${err.message}`)
    process.exit(1)
  }
}

main()
