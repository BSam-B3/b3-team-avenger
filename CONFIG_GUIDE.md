# Configuration Guide — Getting All Secrets

**File:** `.env.local` (copy from `.env.example` and fill all values)

---

## 1. SUPABASE (Database)

**Website:** https://supabase.com

**Steps:**
1. Login to Supabase dashboard
2. Select your project
3. Click **Settings → API**
4. Under "Project API keys":
   - Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`

**Value format:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 2. MICROSOFT AZURE (OAuth2, SharePoint, Email)

**Website:** https://portal.azure.com

### 2.1 Get Client ID & Tenant ID

1. Go to **Azure Active Directory → App registrations**
2. Click **New registration**
   - Name: `B3 Avenger SharePoint`
   - Supported account types: `Single tenant`
   - Redirect URI: `https://yourdomain.com/auth/callback`
3. Click **Register**
4. On **Overview** page, copy:
   - `Application (client) ID` → `AZURE_CLIENT_ID`
   - `Directory (tenant) ID` → `AZURE_TENANT_ID`

### 2.2 Get Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
   - Description: `B3 Avenger`
   - Expires: 1 year
3. Click **Add**
4. **⚠️ COPY THE VALUE (not the Secret ID)**
5. Paste to → `AZURE_CLIENT_SECRET`

**Value format:**
```
AZURE_CLIENT_ID=12345678-1234-1234-1234-123456789012
AZURE_TENANT_ID=87654321-4321-4321-4321-210987654321
AZURE_CLIENT_SECRET=eom8Q~abcd123EfGhIjKlMnOpQrStUvWxYz
```

### 2.3 Get SharePoint Site & Folder IDs

1. Go to **SharePoint Admin Center** (https://admin-sharepoint.microsoft.com)
2. Click **Sites → Active sites**
3. Find your site and click it
4. In URL bar, note the site ID (format: `/sites/sitename/...`)
5. Copy the numeric ID → `AZURE_SHAREPOINT_SITE_ID`
6. Go to the document library folder
7. Click the folder and check URL for folder ID → `AZURE_SHAREPOINT_FOLDER_ID`

**Value format:**
```
AZURE_SHAREPOINT_SITE_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
AZURE_SHAREPOINT_FOLDER_ID=f9e8d7c6-b5a4-3210-fedc-ba9876543210
```

### 2.4 Set API Permissions

1. In app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add:
   - `Files.ReadWrite.All` (for SharePoint)
   - `Sites.ReadWrite.All` (for SharePoint)
   - `Mail.Send` (for email)
6. Click **Grant admin consent**

### 2.5 Get Redirect URI

**Value format:**
```
AZURE_OAUTH_REDIRECT_URI=https://yourdomain.com/auth/callback
```
(Must match what you entered in App registration setup)

---

## 3. SENDGRID (Email Service)

**Website:** https://sendgrid.com

### 3.1 Create Account & Get API Key

1. Sign up at sendgrid.com
2. Verify your email address
3. Go to **Settings → API Keys**
4. Click **Create API Key**
   - Name: `B3 Avenger`
   - Permissions: Full Access
5. Copy the key (starts with `SG.`) → `SENDGRID_API_KEY`

### 3.2 Verify Sender Email

1. Go to **Settings → Sender Authentication**
2. Click **Verify a Single Sender**
3. Add your email: `noreply@yourdomain.com`
4. Check your email for verification link
5. Copy email address → `SENDGRID_FROM_EMAIL`

**Value format:**
```
SENDGRID_API_KEY=SG.1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefgh
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

---

## 4. TELEGRAM (Bot Notifications)

**App:** Telegram (install from App Store or Google Play)

### 4.1 Create Bot

1. Open Telegram app
2. Search for `@BotFather`
3. Send `/newbot`
4. Follow prompts:
   - Bot name: `B3 Avenger Bot`
   - Bot username: `b3_avenger_bot`
5. Copy the **token** → `TELEGRAM_BOT_TOKEN`

**Value format:**
```
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklmnoPQRstuvWXYZabcdef123
```

### 4.2 Get Chat IDs

1. Create 3 Telegram groups:
   - `B3 Avenger Notifications`
   - `B3 Avenger Boss`
   - `B3 Avenger IT Team`
2. Add your bot to each group
3. Send a test message in each group
4. Get chat IDs using:
   ```bash
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
5. Look for `"chat":{"id":123456789}` in response
6. Copy each chat ID → `TELEGRAM_CHAT_ID`, `TELEGRAM_BOSS_CHAT_ID`, `TELEGRAM_IT_TEAM_CHAT_ID`

**Value format:**
```
TELEGRAM_CHAT_ID=-123456789
TELEGRAM_BOSS_CHAT_ID=-987654321
TELEGRAM_IT_TEAM_CHAT_ID=-555666777
```
(Note: group chat IDs start with `-`)

---

## 5. MOBILE API & ADMIN KEYS

Generate random 32-character hex strings:

```bash
# On Mac/Linux:
openssl rand -hex 32

# Output: abc123def456ghi789jkl012mno345pqr
```

Copy the output to:
```
MOBILE_API_KEY=abc123def456ghi789jkl012mno345pqr
ADMIN_API_KEY=xyz789abc123def456ghi789jkl012mno
```

---

## 6. SENTRY (Optional — Error Monitoring)

**Website:** https://sentry.io

1. Sign up and create account
2. Create new project (select "Next.js")
3. Copy the **DSN** value
4. Paste to → `SENTRY_DSN`

**Value format:**
```
SENTRY_DSN=https://abc123def456@sentry.io/123456789
```

Leave blank to disable error monitoring.

---

## 7. REDIS (Optional — Production Caching)

**Option A: Managed Redis (Upstash)**
1. Go to https://upstash.com
2. Create a database
3. Copy **Redis URL**
4. Paste to → `REDIS_URL`

**Option B: Local Redis**
```bash
redis-server
# Then: REDIS_URL=redis://localhost:6379
```

Leave blank to use in-memory cache (development only).

---

## 8. APPLICATION SETTINGS

```
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

---

## Summary: Keys Needed

| Service | Key | Format | Required |
|---------|-----|--------|----------|
| Supabase | 3 keys | UUID + long strings | ✅ Yes |
| Azure | 6 keys | UUIDs + secret | ✅ Yes |
| SendGrid | 2 keys | API key + email | ✅ Yes |
| Telegram | 4 keys | Numbers (chat IDs) | ✅ Yes |
| Mobile API | 1 key | Random hex string | ✅ Yes |
| Admin Panel | 1 key | Random hex string | ✅ Yes |
| Sentry | 1 key | DSN URL | ❌ Optional |
| Redis | 1 key | Connection URL | ❌ Optional |
| App | 2 settings | URL + env | ✅ Yes |

**Total: 9 required + 2 optional**

---

## How to Use

1. Copy `.env.example` → `.env.local`
2. Fill in all values using this guide
3. **Never commit `.env.local` to git** (it's in `.gitignore`)
4. For Vercel deployment, add all values to Vercel dashboard:
   - Settings → Environment Variables

---

**Status:** All 11 keys documented with step-by-step retrieval instructions.
