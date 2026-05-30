# B3 Avenger — Quick Start (5 minutes)

Get up and running in development mode.

## 1. Clone & Install

```bash
cd b3-team-avenger
npm install
```

## 2. Setup Environment

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
# Edit .env.local with your actual tokens
```

**Minimum for local testing:**
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=test-key
MOBILE_API_KEY=test-key
TELEGRAM_BOT_TOKEN=test-token
```

## 3. Database (if using local Supabase)

```bash
# Start local Supabase
supabase start

# Run migrations
supabase db push

# Or manually:
psql $DATABASE_URL < app/lib/setup/quotation-schema.sql
psql $DATABASE_URL < app/lib/setup/mobile-schema.sql
psql $DATABASE_URL < app/lib/setup/jarvis-schema.sql
```

## 4. Seed Data

```bash
psql $DATABASE_URL < scripts/seed-database.sql
```

## 5. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

## 6. Test an Endpoint

```bash
# Quotation: Create draft
curl -X POST http://localhost:3000/api/quotation/create-draft \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust-1","templateId":"tmpl-1","salesPersonId":"john","markupPct":25}'

# Voice: Send command
curl -X POST http://localhost:3000/api/mobile/voice \
  -H "Content-Type: application/json" \
  -d '{"transcript":"create a ticket","userId":"user-1","apiKey":"test-key"}'

# Jarvis: Create checklist
curl -X POST http://localhost:3000/api/jarvis/checklist \
  -H "Content-Type: application/json" \
  -d '{"technicianId":"tech-1","customerId":"cust-1","siteType":"on-site-server"}'
```

## 7. View Dashboard

- Main: http://localhost:3000 (coming soon)
- Quotations: http://localhost:3000/quotation
- Voice commands: http://localhost:3000/mobile
- Checklists: http://localhost:3000/jarvis

## Common Commands

```bash
# Run tests
npm run test

# Lint code
npm run lint

# Build for production
npm run build

# Deploy to Vercel
vercel deploy --prod

# Watch logs
supabase logs --follow

# Database shell
psql $DATABASE_URL
```

## Folder Map

```
app/api/         — API endpoints
  └─ workers/    — Cron jobs
  └─ quotation/  — Quotation endpoints
  └─ mobile/     — Voice gateway
  └─ jarvis/     — Checklist system

app/quotation/   — Dashboard pages
app/mobile/
app/jarvis/

lib/             — Utilities
  └─ graph/      — Microsoft Graph client
  └─ pdf/        — PDF generation
  └─ notifications/ — Telegram
  └─ api/        — Request validation
  └─ setup/      — Database schemas

__tests__/       — Integration tests
  └─ api/        — API test suites
  └─ setup.ts    — Test utilities

scripts/         — Database seeding
```

## Environment Variables Explained

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Database | Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | DB auth | Supabase → Settings → API |
| `AZURE_CLIENT_ID` | Microsoft auth | Azure portal → App registration |
| `AZURE_CLIENT_SECRET` | Microsoft secret | Azure → Certificates & secrets |
| `SENDGRID_API_KEY` | Email API | SendGrid → Settings → API Keys |
| `TELEGRAM_BOT_TOKEN` | Telegram bot | @BotFather on Telegram |
| `MOBILE_API_KEY` | Voice auth | Any value (set it yourself) |

## Troubleshooting

### Database connection error
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Or for Supabase:
supabase status
```

### Port 3000 already in use
```bash
# Use different port
npm run dev -- -p 3001
```

### Jest tests not finding modules
```bash
# Clear Jest cache
npm run test -- --clearCache
```

### Telegram notifications not working
- Check `TELEGRAM_BOT_TOKEN` is valid
- Check `TELEGRAM_CHAT_ID` format (should be number)
- Test with: `curl https://api.telegram.org/bot<TOKEN>/getMe`

## Next Steps

1. **Setup production credentials** → Follow `ADMIN_SETUP.md`
2. **Deploy** → Run `vercel deploy --prod`
3. **Monitor** → Setup Sentry for error tracking
4. **Scale** → Upgrade Vercel/Supabase plans if needed

---

**Total setup time:** ~30 minutes  
**First test:** ~5 minutes
