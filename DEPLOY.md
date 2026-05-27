# B3 Team Avenger — Deploy Guide (Updated)

## ขั้นตอนเร็ว: Dev → GitHub → Vercel

---

## Step 1: ตรวจสอบ AI Keys ใน .env.local

ระบบต้องการอย่างน้อย 1 key (มีแล้ว = Groq + Gemini):

| Key | ที่ไหน | ราคา |
|-----|-------|------|
| `GROQ_API_KEY` | console.groq.com | ฟรี 14,400 req/วัน |
| `GEMINI_API_KEY` | aistudio.google.com | ฟรี tier |
| `ANTHROPIC_API_KEY` | console.anthropic.com | $0.80/1M tokens |
| `OPENAI_API_KEY` | platform.openai.com/api-keys | $0.15/1M tokens |

ถ้าอยากเพิ่ม OpenAI: เปิด `.env.local` → ใส่ `OPENAI_API_KEY=sk-...`

---

## Step 2: GitHub Repository

```powershell
cd C:\Users\PC\Desktop\b3-team-avenger

# ถ้ายังไม่ได้ init
git init
git add .
git commit -m "B3 Team Avenger — full system v1"

# สร้าง repo ที่ github.com/new → ชื่อ b3-team-avenger → Copy remote URL
git remote add origin https://github.com/YOUR_USERNAME/b3-team-avenger.git
git branch -M main
git push -u origin main
```

---

## Step 3: Vercel Deploy

1. ไป [vercel.com](https://vercel.com) → **Add New → Project**
2. Import repo `b3-team-avenger` จาก GitHub
3. เพิ่ม **Environment Variables** (คัดลอกจาก `.env.local`):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://uidkyvqjwigzidxpwort.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJ... (จาก .env.local) |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJ... (จาก .env.local) |
| `GROQ_API_KEY` | gsk_... |
| `GEMINI_API_KEY` | AIza... |
| `ANTHROPIC_API_KEY` | sk-ant-... (ถ้ามี) |
| `OPENAI_API_KEY` | sk-... (ถ้ามี) |
| `DASHBOARD_PASSWORD` | b3avenger2026 |
| `NEXT_PUBLIC_APP_URL` | https://YOUR-APP.vercel.app ← ใส่หลัง deploy ครั้งแรก |

4. กด **Deploy**

---

## Step 4: First-Time Database Seed

หลัง deploy ครั้งแรก ต้อง seed agent contexts จาก .md → Supabase:

```bash
# เรียก 1 ครั้ง หลัง deploy
curl -X POST https://YOUR-APP.vercel.app/api/admin/sync-contexts
```

หรือเปิด browser ไปที่ `https://YOUR-APP.vercel.app/api/admin/sync-contexts` (POST)

---

## Step 5: อัพเดต NEXT_PUBLIC_APP_URL

1. หลัง deploy แล้ว copy URL ที่ Vercel ให้
2. ไป Vercel Dashboard → Settings → Environment Variables
3. แก้ `NEXT_PUBLIC_APP_URL` = `https://YOUR-APP.vercel.app`
4. Redeploy

---

## Pages

| URL | คืออะไร |
|-----|---------|
| `/` | Landing / redirect |
| `/dashboard` | Office map — 14 agents เดินเล่น |
| `/room` | CEO room + Janie chat + Usage dashboard |
| `/history` | ประวัติการสั่งงานทั้งหมด |
| `/sprite-test` | ทดสอบ sprite animation |
| `/api/admin/sync-contexts` | (POST) seed agent contexts → Supabase |
| `/api/usage/stats` | (GET) token/cost statistics |

---

## Cost Estimate

ใช้งานปกติ 50 conversations/วัน ≈ 200 AI calls:
- Groq: ฟรี (quota 14,400/วัน)
- Gemini: ฟรี (ถ้าอยู่ใน free tier)
- Claude Haiku: ~$0.001/conversation → ~$1.5/เดือน
- GPT-4o Mini: ~$0.001/conversation → ~$1.5/เดือน

**สรุป: ใช้ฟรีได้ตลอดถ้ามีแค่ Groq + Gemini**

---

## Supabase Tables ที่ต้องมี

ถ้า tables ยังไม่มี ให้รัน migrations ใน `supabase/migrations/`
หรือ apply ผ่าน Supabase Dashboard → SQL Editor

Tables:
- `janie_conversations` — conversation lifecycle
- `agent_tasks` — tasks linked to conversations  
- `agent_messages` — agent responses
- `agent_kpi` — task counters
- `agent_contexts` — agent context (Vercel-safe)
- `api_usage_logs` — token/cost tracking
- `agent_logs` — audit log
- RPC Function: `increment_agent_kpi(p_agent_id, p_success)`
