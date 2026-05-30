# B3 Team Avenger — Deployment Guide

## 🚀 Pre-Deployment Checklist

### 1. Environment Variables (`.env.local`)

```bash
# Microsoft Graph API (for PDF + SharePoint + Email)
AZURE_CLIENT_ID=your_app_id
AZURE_CLIENT_SECRET=your_app_secret
AZURE_TENANT_ID=your_tenant_id
AZURE_SHAREPOINT_SITE_ID=your_sharepoint_site_id
AZURE_SHAREPOINT_FOLDER_ID=your_sharepoint_folder_id

# SendGrid (for quotations + PDF email)
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=no-reply@b3avenger.com

# Mobile S26 Gateway
MOBILE_API_KEY=your_mobile_api_key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Supabase (already set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Database Migrations

Run migrations in order:

```bash
# TIER 1-2 (morning-brief, email-secretary) — no schema changes
# TIER 3 (PDF)
supabase db push # applies migrations if any

# TIER 4a (Quotation)
psql $DATABASE_URL -f app/lib/setup/quotation-schema.sql

# TIER 4b (Mobile)
psql $DATABASE_URL -f app/lib/setup/mobile-schema.sql

# TIER 4c (Jarvis)
psql $DATABASE_URL -f app/lib/setup/jarvis-schema.sql
```

### 3. Quotation Templates Setup

```sql
INSERT INTO quotation_templates (name, solution_type, base_cost, description) VALUES
  ('Hardware Refresh', 'upgrade-hardware', 50000, 'CPU + RAM + Disk'),
  ('Software License', 'software-license', 15000, 'OS + Microsoft Office'),
  ('Network Setup', 'network-setup', 30000, 'Router + Switch + Cabling'),
  ('Backup System', 'backup-solution', 25000, 'NAS + Backup Software'),
  ('Security Audit', 'security-audit', 20000, 'Vulnerability scan + recommendations');
```

### 4. Checklist Templates Setup

```sql
INSERT INTO checklist_templates (site_type, items) VALUES
  ('on-site-server', '["CPU Status", "RAM Check", "Disk Space", "Network Connectivity", "Fan Cooling", "Power Supply", "Temperature"]'::jsonb),
  ('workstation-audit', '["OS Version", "RAM", "Storage", "Antivirus", "Firewall", "Updates", "Performance"]'::jsonb),
  ('network-check', '["Router", "Switch", "Cables", "WiFi Signal", "Internet Speed", "DNS", "Gateway"]'::jsonb);
```

### 5. Vercel Configuration

Update `vercel.json` crons (already done for TIER 1-2):

```json
{
  "crons": [
    { "path": "/api/workers/midnight-hunter", "schedule": "0 0 * * *" },
    { "path": "/api/workers/morning-brief", "schedule": "0 1 * * *" },
    { "path": "/api/workers/email-secretary", "schedule": "0 2 * * *" },
    { "path": "/api/workers/weekly-condense", "schedule": "0 2 * * 0" }
  ]
}
```

**Note:** Vercel Hobby plan limited to 2 crons/day. Consider:
- Upgrading to Pro ($20/month)
- OR consolidating crons into single endpoint
- OR moving to local Openclaw for non-Vercel crons

### 6. Dependencies

```bash
npm install
# Key new packages:
# - @azure/identity (Microsoft OAuth)
# - @microsoft/microsoft-graph-client (SharePoint)
# - pdf-lib (PDF generation)
# - sendgrid (email)
```

### 7. Build & Test

```bash
npm run build
npm run lint

# Test endpoints locally
curl -X POST http://localhost:3000/api/quotation/create-draft \
  -H "Content-Type: application/json" \
  -d '{"customerId":"...", "templateId":"...", "salesPersonId":"john", "markupPct":25}'
```

### 8. Deploy to Vercel

```bash
vercel deploy --prod
```

---

## 📋 Post-Deployment

### Verify Each TIER

- **TIER 1:** Check `/dashboard` — email badge should update
- **TIER 2:** Wait 09:00 ICT — Telegram should receive email summary
- **TIER 3:** Manually call `/api/pdf/generate-report` — PDF should generate
- **TIER 4a:** Call `/api/quotation/create-draft` — boss should get Telegram alert
- **TIER 4b:** Send JSON to `/api/mobile/voice` — voice command should log
- **TIER 4c:** Call `/api/jarvis/checklist` — checklist should start

### Monitoring

Watch Vercel logs for errors:

```bash
vercel logs --tail
```

Monitor Telegram channel for system alerts.

---

## 🔐 Security Checklist

- [ ] CORS configured for mobile endpoints
- [ ] API keys rotated and stored securely
- [ ] SharePoint permissions limited to necessary scopes
- [ ] Quotation drafts require approval (no direct publish)
- [ ] Checklist photos encrypted in transit
- [ ] Rate limiting enabled on voice endpoint

---

## 🚨 Known Limitations

1. **Vercel Hobby cron limit:** 2 crons/day max. Morning-brief + email-secretary = 2 slots.
2. **10s timeout:** PDF generation might exceed. Consider local Openclaw fallback.
3. **PDF generation placeholder:** Uses pdf-lib (no Puppeteer). Complex layouts need enhancement.
4. **SharePoint OAuth:** Requires manual credential setup in Azure portal.
5. **Voice intent parser:** Rule-based only. Consider adding NLP later.
6. **Checklist photos:** Currently stored as URLs only. Implement S3/SharePoint storage.
