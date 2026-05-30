# B3 Team Avenger — AI-Powered Enterprise System

Complete AI orchestration system for B3 Corporation IT Support & Business Operations.

## 🏗️ Architecture Overview

**TIER 1:** Morning Operations (crons)
- 08:00 ICT: Morning Brief (calendar + open tickets)
- Email unread badge on dashboard

**TIER 2:** Email Secretary (cron)
- 09:00 ICT: Scan M365 → summarize → Telegram

**TIER 3:** PDF + SharePoint
- Ticket resolutions → PDF generation
- Microsoft Graph API + SendGrid email

**TIER 4a:** Quotation System
- Templates + Vendor DB
- Boss 1-click approval via Telegram

**TIER 4b:** Mobile S26 Voice Gateway
- Voice commands → Intent parser
- Brief Telegram notifications

**TIER 4c:** IT Jarvis Checklist
- On-site equipment checklists
- Photo upload + progress tracking

## 📁 Project Structure

```
app/api/workers/          — Cron jobs (morning-brief, email-secretary)
app/api/pdf/              — PDF generation
app/api/quotation/        — Quotation system (create/approve/reject)
app/api/mobile/           — Voice command gateway
app/api/jarvis/           — IT checklist endpoints
app/quotation/            — Dashboard page
app/mobile/               — Voice commands page
app/jarvis/               — Checklist page
lib/graph/                — Microsoft Graph client
lib/pdf/                  — PDF utilities
lib/setup/                — Database schemas
scripts/                  — Seeding scripts
```

## 🚀 Quick Start

```bash
npm install

# Set env vars in .env.local
AZURE_CLIENT_ID=...
SENDGRID_API_KEY=...
MOBILE_API_KEY=...

# Run migrations
psql $DATABASE_URL < app/lib/setup/quotation-schema.sql
psql $DATABASE_URL < app/lib/setup/mobile-schema.sql
psql $DATABASE_URL < app/lib/setup/jarvis-schema.sql

# Seed data
psql $DATABASE_URL < scripts/seed-database.sql

# Develop
npm run dev

# Deploy
npm run build
vercel deploy --prod
```

## 📊 Dashboards

- `/quotation` — All quotations (status + cost)
- `/mobile` — Voice command history
- `/jarvis` — Checklist progress

## 🔐 Security

- API key auth on mobile endpoint
- Approval required for quotations
- Read-only probes on Jarvis
- Token lifecycle managed

## 📞 Docs

- [Deployment](./DEPLOYMENT.md)
- [Bridge Protocol](../wiki/BRIDGE-PROTOCOL.md)
- [Architecture](../Gemini%20Project2.md)

---
Built by Claude + Openclaw | Status: PRODUCTION READY
