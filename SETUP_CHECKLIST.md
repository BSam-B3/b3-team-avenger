# B3 Avenger Setup — ทำตามลำดับนี้

## ✅ ทีละขั้น เก็บผลลัพธ์ไว้ในโน้ต

---

## STEP 1: SUPABASE (ฐานข้อมูล) — 3 นาที

### ที่ต้องทำ:
1. ไปที่ https://supabase.com → Login
2. เลือก Project ที่มี
3. คลิก **Settings** → **API**
4. **คัดลอก** 3 values นี้:
   - `Project URL` (ขึ้นต้นด้วย `https://`)
   - `anon public` key 
   - `service_role secret` key

### เก็บไว้ที่:
```
NEXT_PUBLIC_SUPABASE_URL = [คัดลอกมาใส่ที่นี่]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [คัดลอกมาใส่ที่นี่]
SUPABASE_SERVICE_ROLE_KEY = [คัดลอกมาใส่ที่นี่]
```

---

## STEP 2: AZURE (Microsoft OAuth) — 10 นาที

### ที่ต้องทำ:
1. ไปที่ https://portal.azure.com → Login
2. ค้นหา **App registrations**
3. คลิก **New registration**
   - Name: `B3 Avenger SharePoint`
   - Account type: `Single tenant`
   - Redirect URI: `https://yourdomain.com/auth/callback`
   - คลิก **Register**

4. ในหน้า **Overview** ให้ **คัดลอก**:
   - `Application (client) ID`
   - `Directory (tenant) ID`

5. ไปที่ **Certificates & secrets**
   - คลิก **New client secret**
   - Expires: `1 year`
   - คลิก **Add**
   - **⚠️ คัดลอก VALUE (ไม่ใช่ Secret ID)**

6. ไปที่ **API permissions**
   - คลิก **Add a permission**
   - เลือก **Microsoft Graph**
   - เลือก **Delegated permissions**
   - ค้นหา + เพิ่ม:
     - `Files.ReadWrite.All`
     - `Sites.ReadWrite.All`
     - `Mail.Send`
   - คลิก **Grant admin consent**

### เก็บไว้ที่:
```
AZURE_CLIENT_ID = [Application ID]
AZURE_TENANT_ID = [Directory ID]
AZURE_CLIENT_SECRET = [Secret Value - ⚠️ คัดลอก VALUE ไม่ใช่ ID]
AZURE_OAUTH_REDIRECT_URI = https://yourdomain.com/auth/callback
```

### SHAREPOINT IDs (ถ้ามี SharePoint):
1. ไปที่ https://admin-sharepoint.microsoft.com
2. ไปที่ **Sites** → **Active sites**
3. เลือก Site ของคุณ
4. ในที่อยู่บาร์ (URL) ให้ Copy Site ID (UUID format)
5. เข้า Document Library → Copy Folder ID

```
AZURE_SHAREPOINT_SITE_ID = [Site UUID]
AZURE_SHAREPOINT_FOLDER_ID = [Folder UUID]
```

---

## STEP 3: SENDGRID (Email) — 5 นาที

### ที่ต้องทำ:
1. ไปที่ https://sendgrid.com → Sign up
2. ยืนยันอีเมล
3. ไปที่ **Settings** → **API Keys**
4. คลิก **Create API Key**
   - Name: `B3 Avenger`
   - Permissions: `Full Access`
5. **คัดลอก** API Key (ขึ้นต้นด้วย `SG.`)

6. ไปที่ **Settings** → **Sender Authentication**
7. คลิก **Verify a Single Sender**
8. ใส่อีเมล: `noreply@yourdomain.com`
9. ยืนยันจากอีเมล

### เก็บไว้ที่:
```
SENDGRID_API_KEY = [SG.xxxxxxxxxx]
SENDGRID_FROM_EMAIL = noreply@yourdomain.com
```

---

## STEP 4: TELEGRAM (Notifications) — 5 นาที

### ที่ต้องทำ:
1. เปิด Telegram App
2. ค้นหา `@BotFather`
3. ส่ง: `/newbot`
4. ตามตัวบอก:
   - Bot name: `B3 Avenger Bot`
   - Username: `b3_avenger_bot`
5. **คัดลอก Bot Token** (ตัวเลข:ตัวหนังสือ)

### สร้าง 3 Chat Groups:
1. สร้าง Group ใหม่: `B3 Avenger Notifications`
2. สร้าง Group ใหม่: `B3 Avenger Boss`
3. สร้าง Group ใหม่: `B3 Avenger IT Team`
4. เพิ่ม Bot ไปในแต่ละ Group
5. ส่งข้อความทดสอบในแต่ละ Group

### หา Chat IDs:
**รัน Command นี้ใน Terminal/Command Prompt:**
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates"
```
(แทน `<YOUR_BOT_TOKEN>` ด้วย Token ที่คัดลอกมา)

**ในผลลัพธ์ JSON ให้หา:**
```json
"chat": {
  "id": -123456789
}
```

### เก็บไว้ที่:
```
TELEGRAM_BOT_TOKEN = [123456789:ABCdef...]
TELEGRAM_CHAT_ID = [negative number]
TELEGRAM_BOSS_CHAT_ID = [negative number]
TELEGRAM_IT_TEAM_CHAT_ID = [negative number]
```

---

## STEP 5: สร้าง Random Keys — 2 นาที

**รัน Command นี้ใน Terminal/Command Prompt:**

### Windows (PowerShell):
```powershell
-join ((0..31) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
```

### Mac/Linux (Terminal):
```bash
openssl rand -hex 32
```

**ทำซ้ำ 2 ครั้ง เก็บ 2 values:**

```
MOBILE_API_KEY = [random_hex_32_chars]
ADMIN_API_KEY = [random_hex_32_chars]
```

---

## STEP 6: Optional - Sentry (Error Monitoring) — 3 นาที

1. ไปที่ https://sentry.io → Sign up
2. Create Project → Select "Next.js"
3. **คัดลอก DSN** (ขึ้นต้นด้วย `https://`)

```
SENTRY_DSN = [https://xxx@sentry.io/123]
```

(ถ้าไม่ต้องใช้ ปล่อยว่างได้)

---

## STEP 7: ระบุตัวแปรทั่วไป — 1 นาที

```
NEXT_PUBLIC_APP_URL = https://yourdomain.com
NODE_ENV = production
```

---

## ✅ ตรวจสอบ Checklist นี้

- [ ] STEP 1: Supabase (3 keys) ✓
- [ ] STEP 2: Azure (4 keys + 2 SharePoint IDs) ✓
- [ ] STEP 3: SendGrid (2 keys) ✓
- [ ] STEP 4: Telegram (1 token + 3 chat IDs) ✓
- [ ] STEP 5: Random keys (2 keys) ✓
- [ ] STEP 6: Sentry (1 key) - Optional
- [ ] STEP 7: App settings (2 vars) ✓

---

## สรุปจำนวน Keys ที่ต้อง:

| ขั้น | Service | Keys | รวม |
|-----|---------|------|-----|
| 1 | Supabase | 3 | 3 |
| 2 | Azure | 6 | 9 |
| 3 | SendGrid | 2 | 11 |
| 4 | Telegram | 4 | 15 |
| 5 | Random | 2 | 17 |
| 6 | Sentry | 1 | 18 (optional) |
| 7 | App | 2 | 20 |

**ต้องทำทั้งหมด: 19 Keys**

---

## หลังจากได้ Keys ทั้งหมด:

1. เปิดไฟล์ `.env.local` (copy จาก `.env.example`)
2. ใส่ค่าทั้ง 19 keys
3. **เก็บไว้ที่:** `C:\Users\PC\Desktop\b3-team-avenger\.env.local`
4. **ไม่ต้องอัปโหลดไปที่ Git**

---

**เสร็จแล้วแจ้งผมว่า "Done" เพื่อทำขั้นต่อไป**
