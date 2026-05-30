# B3 Avenger — Admin Setup Guide

Complete setup instructions for deploying the system.

## Phase 1: Microsoft Azure Setup (30 min)

### 1.1 Create Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory → App registrations**
3. Click **New registration**
   - Name: `B3 Avenger SharePoint`
   - Supported account types: `Single tenant`
   - Redirect URI: `https://yourdomain.com/auth/callback`
4. Click **Register**

### 1.2 Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Set expiry (e.g., 1 year)
4. Copy the **value** (not the ID) → save to `.env.local` as `AZURE_CLIENT_SECRET`

### 1.3 Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Search and add:
   - `Files.ReadWrite.All`
   - `Sites.ReadWrite.All`
   - `Mail.Send`
6. Click **Grant admin consent**

### 1.4 SharePoint Site Setup

1. Go to [SharePoint Admin Center](https://admin-sharepoint.microsoft.com)
2. Create a new site (or use existing)
3. Note the **Site ID** and **Folder ID**
4. Grant the app permissions:
   - PowerShell:
   ```powershell
   Connect-SPOService -Url https://yourtenant-admin.sharepoint.com
   Grant-SPOAzureADAppSitePermission -AppId <your-app-id> -SiteUrl <site-url> -PermissionType Write
   ```

### 1.5 Environment Variables

Copy to `.env.local`:
```bash
AZURE_CLIENT_ID=your_app_id (from Overview tab)
AZURE_CLIENT_SECRET=your_client_secret
AZURE_TENANT_ID=your_tenant_id (from Overview tab)
AZURE_SHAREPOINT_SITE_ID=your_site_id
AZURE_SHAREPOINT_FOLDER_ID=your_folder_id
```

---

## Phase 2: SendGrid Email Setup (15 min)

### 2.1 Create SendGrid Account

1. Go to [SendGrid](https://sendgrid.com)
2. Sign up and verify email
3. Navigate to **Settings → API Keys**
4. Click **Create API Key**
5. Name: `B3 Avenger`
6. Copy the key → `.env.local` as `SENDGRID_API_KEY`

### 2.2 Verify Sender Email

1. Go to **Settings → Sender Authentication**
2. Click **Verify a Single Sender**
3. Add your company email: `noreply@yourdomain.com`
4. Follow verification steps (check email)

### 2.3 Environment Variables

```bash
SENDGRID_API_KEY=your_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

---

## Phase 3: Telegram Bot Setup (10 min)

### 3.1 Create Bot

1. Chat with [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot`
3. Choose name: `B3 Avenger Bot`
4. Choose username: `b3_avenger_bot`
5. Copy **bot token** → `.env.local` as `TELEGRAM_BOT_TOKEN`

### 3.2 Get Chat IDs

1. Create a Telegram group: `B3 Avenger Notifications`
2. Add your bot to the group
3. Send a test message to your bot
4. Call API to get chat ID:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
5. Look for `chat.id` in response
6. Add to `.env.local`:
   ```bash
   TELEGRAM_CHAT_ID=your_chat_id
   TELEGRAM_BOSS_CHAT_ID=boss_chat_id
   TELEGRAM_IT_TEAM_CHAT_ID=it_team_chat_id
   ```

---

## Phase 4: Database Setup (20 min)

### 4.1 Run Migrations

```bash
# Apply schema migrations
psql $DATABASE_URL < app/lib/setup/quotation-schema.sql
psql $DATABASE_URL < app/lib/setup/mobile-schema.sql
psql $DATABASE_URL < app/lib/setup/jarvis-schema.sql
```

### 4.2 Seed Initial Data

```bash
psql $DATABASE_URL < scripts/seed-database.sql
```

### 4.3 Verify Tables

```bash
psql $DATABASE_URL -c "
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;
"
```

Expected tables:
- `quotation_templates`
- `vendor_db`
- `quotation_drafts`
- `voice_commands`
- `voice_results`
- `onsite_checklists`
- `checklist_templates`
- `checklist_items`

---

## Phase 5: Application Deployment (30 min)

### 5.1 Install Dependencies

```bash
npm install
```

Key dependencies added:
- `@azure/identity` — OAuth2
- `@microsoft/microsoft-graph-client` — SharePoint API
- `pdf-lib` — PDF generation
- `sendgrid` — Email service
- `@supabase/supabase-js` — Database client
- `jest` + `@testing-library/react` — Testing

### 5.2 Build & Test

```bash
npm run lint
npm run build
npm run test
```

### 5.3 Deploy to Vercel

```bash
npm run build
vercel deploy --prod
```

Add environment variables to Vercel dashboard:
- Copy all values from `.env.local`
- Settings → Environment Variables

### 5.4 Verify Crons

1. Go to Vercel dashboard
2. Project → Settings → Crons
3. Should see:
   - `/api/workers/morning-brief` — 0 1 * * *
   - `/api/workers/email-secretary` — 0 2 * * *

---

## Phase 6: Testing (15 min)

### 6.1 Run Integration Tests

```bash
npm run test
```

### 6.2 Manual Testing

**Test Quotation System:**
```bash
curl -X POST http://localhost:3000/api/quotation/create-draft \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust-001",
    "templateId": "template-001",
    "salesPersonId": "john",
    "markupPct": 25
  }'
```

**Test Mobile Voice:**
```bash
curl -X POST http://localhost:3000/api/mobile/voice \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "create a ticket for issue 123",
    "userId": "user-001",
    "apiKey": "your_mobile_api_key"
  }'
```

**Test Jarvis Checklist:**
```bash
curl -X POST http://localhost:3000/api/jarvis/checklist \
  -H "Content-Type: application/json" \
  -d '{
    "technicianId": "tech-001",
    "customerId": "cust-001",
    "siteType": "on-site-server"
  }'
```

---

## Phase 7: Monitoring & Maintenance (Ongoing)

### 7.1 Log Monitoring

```bash
# Watch Vercel logs
vercel logs --tail

# Check Supabase logs
supabase logs --level ERROR
```

### 7.2 Telegram Alerts

System sends alerts to:
- Quotation approvals → `TELEGRAM_BOSS_CHAT_ID`
- Email summaries → `TELEGRAM_CHAT_ID`
- Checklist updates → `TELEGRAM_IT_TEAM_CHAT_ID`

### 7.3 Performance Checks

Monitor at:
- **Vercel dashboard:** Build times, edge function usage
- **Supabase dashboard:** Database connections, API rates
- **Azure portal:** Microsoft Graph API usage

### 7.4 Scheduled Maintenance

- **Monthly:** Review SendGrid bounce/spam reports
- **Quarterly:** Rotate API keys and tokens
- **Annually:** Audit Azure permissions and SharePoint access

---

## Troubleshooting

### Issue: "Unauthorized" from SharePoint

**Solution:**
1. Verify `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET`
2. Check Azure permissions in portal
3. Re-run `Grant-SPOAzureADAppSitePermission`

### Issue: SendGrid emails not sending

**Solution:**
1. Verify sender email is verified in SendGrid
2. Check `SENDGRID_API_KEY` in `.env.local`
3. View SendGrid logs for bounce reasons

### Issue: Telegram bot not responding

**Solution:**
1. Verify `TELEGRAM_BOT_TOKEN` is correct
2. Check chat IDs (should be numbers)
3. Test with curl: `curl https://api.telegram.org/bot<TOKEN>/getMe`

### Issue: PDF generation timeout

**Solution:**
1. Check Vercel function timeout (default 10s)
2. Consider upgrading to Vercel Pro for longer timeouts
3. Use local Openclaw for heavy PDFs

---

## Security Checklist

Before going production:

- [ ] All secrets in `.env.local` (not in git)
- [ ] `.env.local` added to `.gitignore`
- [ ] API keys rotated and secured
- [ ] SharePoint permissions limited to necessary scopes
- [ ] Quotation approval workflow enforced
- [ ] Voice command rate limiting enabled
- [ ] Checklist photos encrypted in transit
- [ ] Database backups enabled in Supabase
- [ ] CORS configured on mobile endpoints
- [ ] Regular security audits scheduled

---

## Support Resources

- [Azure Documentation](https://docs.microsoft.com/azure)
- [SendGrid API Docs](https://docs.sendgrid.com)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)

---

**Setup Time:** ~2 hours total  
**Ongoing Maintenance:** 1-2 hours per month
