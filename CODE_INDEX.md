# B3 Avenger — Complete Code Index

Quick reference to all files and their purpose.

## 📖 Documentation

| File | Purpose |
|------|---------|
| `README.md` | Project overview (2-min read) |
| `QUICK_START.md` | 5-minute setup guide |
| `DEPLOYMENT.md` | Step-by-step deployment instructions |
| `ADMIN_SETUP.md` | Azure, SendGrid, Telegram configuration (7 phases) |
| `ARCHITECTURE.md` | System design, data flows, database schema |
| `CODE_INDEX.md` | This file — code reference |

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `.env.example` | Template for environment variables |
| `jest.config.js` | Jest testing configuration |
| `jest.setup.js` | Jest setup (mocks, globals) |
| `vercel.json` | Vercel deployment config (crons) |
| `next.config.js` | Next.js configuration |
| `tsconfig.json` | TypeScript configuration |
| `package.json` | Dependencies and npm scripts |

## 🌐 API Endpoints (app/api/)

### Workers (Automated Crons)

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/workers/morning-brief` | 08:00 ICT daily | Calendar + tickets brief → Telegram |
| `/workers/email-secretary` | 09:00 ICT daily | M365 unread scan → 3-line summary |
| `/workers/midnight-hunter` | 00:00 UTC daily | Archive old tickets (future) |
| `/workers/weekly-condense` | 00:00 UTC Sunday | Weekly digest (future) |

### Quotation System (app/api/quotation/)

| Endpoint | Method | Purpose | Input |
|----------|--------|---------|-------|
| `/quotation/create-draft` | POST | Create quotation draft | `{customerId, templateId, salesPersonId, markupPct}` |
| `/quotation/approve` | POST | Approve + generate PDF | `{quotationId, approverId}` |
| `/quotation/reject` | POST | Reject + notify seller | `{quotationId, reason}` |

**Database:** `quotation_drafts`, `quotation_templates`, `vendor_db`

### Mobile Voice Gateway (app/api/mobile/)

| Endpoint | Method | Purpose | Input |
|----------|--------|---------|-------|
| `/mobile/voice` | POST | Process voice command | `{transcript, userId, apiKey}` |
| `/mobile/confirm` | POST | Confirm/cancel command | `{commandId, confirmed, apiKey}` |

**Intent detection:** create-ticket, create-quotation, check-email, fetch-brief, check-status

**Database:** `voice_commands`, `voice_results`

### IT Jarvis Checklist (app/api/jarvis/)

| Endpoint | Method | Purpose | Input |
|----------|--------|---------|-------|
| `/jarvis/checklist` | POST | Create checklist from template | `{technicianId, customerId, siteType}` |
| `/jarvis/checklist` | GET | Fetch checklist + progress | `?checklistId=...` |
| `/jarvis/item` | PATCH | Mark item done + add photo | `{itemId, status, photoUrl, notes}` |
| `/jarvis/complete` | POST | Finalize checklist → ZIP | `{checklistId}` |

**Templates:** on-site-server, workstation-audit, network-check, equipment-inventory

**Database:** `onsite_checklists`, `checklist_templates`, `checklist_items`

### Document Generation (app/api/pdf/)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/pdf/generate-report` | POST | Generate ticket resolution PDF |

Uses `pdf-lib` + SharePoint upload + SendGrid email

## 📊 Dashboard Pages (app/)

| Route | File | Purpose |
|-------|------|---------|
| `/quotation` | `quotation/page.tsx` | View all quotation drafts |
| `/mobile` | `mobile/page.tsx` | Voice command history |
| `/jarvis` | `jarvis/page.tsx` | Checklist progress tracker |

All pages use Supabase client + real-time fetch

## 📦 Utilities (lib/)

### Notifications (lib/notifications/)

**File:** `telegram.ts`
- `sendTelegramMessage()` — Send message with optional buttons
- `sendQuotationApprovalRequest()` — Boss approval flow
- `sendVoiceCommandAlert()` — Voice command confirmation
- `sendChecklistNotification()` — Checklist updates

### API Utilities (lib/api/)

**File:** `validation.ts`
- `validateRequiredFields()` — Check required input fields
- `validateEnum()` — Validate enum values
- `validateEmail()` — Email format validation
- `validateMarkupPercentage()` — Quotation markup (0-100%)
- `validatePhoneNumber()` — Phone format
- `validateApiKey()` — API key verification
- `checkRateLimit()` — Memory-based rate limiting
- Error response helpers: `createErrorResponse()`, `createSuccessResponse()`

### Microsoft Graph (lib/graph/)

**File:** `client.ts`
- `getClientCredential()` — OAuth2 setup
- `uploadToSharePoint()` — File upload
- `getCustomerFromSharePoint()` — Data retrieval
- `sendEmailViaGraph()` — Send email via Microsoft 365

### PDF Generation (lib/pdf/)

**File:** `generator.ts`
- `generateQuotationPDF()` — Create quotation PDF
- `generateReportPDF()` — Ticket resolution report
- Uses `pdf-lib` for lightweight generation

### Database Schemas (lib/setup/)

| File | Tables | Purpose |
|------|--------|---------|
| `quotation-schema.sql` | `quotation_templates`, `vendor_db`, `quotation_drafts` | Quotation system |
| `mobile-schema.sql` | `voice_commands`, `voice_results` | Voice gateway |
| `jarvis-schema.sql` | `checklist_templates`, `onsite_checklists`, `checklist_items` | IT checklist |

All schemas include:
- Primary keys (UUID)
- Foreign key constraints
- Timestamp columns
- Status enums
- JSONB fields for flexible data

## 🧪 Tests (__tests__/)

### Setup Utilities

**File:** `setup.ts`
- `supabase` — Test database client
- `apiCall()` — Make HTTP requests to endpoints
- `cleanupTestData()` — Delete test records
- `seedTestCustomer()` — Create test customer
- `seedTestTemplate()` — Create test quotation template
- `expectSuccess()` / `expectError()` — Assertion helpers

### Test Suites

| File | Coverage | Tests |
|------|----------|-------|
| `api/quotation.test.ts` | Create, approve, reject | 5+ tests |
| `api/mobile.test.ts` | Voice commands, confirmation, rate limit | 7+ tests |

Jest configuration includes:
- 30s timeout per test
- Code coverage tracking
- Module path mapping (`@/` aliases)

## 🗂️ Data Models

### Quotation

```
User (Salesperson)
  → Creates draft quotation
  → Boss approves via Telegram
  → PDF generated + emailed
  → Status tracked in dashboard
```

### Voice Commands

```
Phone (S26)
  → Voice transcript + intent
  → Simple actions execute immediately
  → Complex actions need confirmation
  → Results logged + Telegram alert
```

### Checklists

```
Technician (field)
  → Creates checklist from template
  → Marks items done/NA with photos
  → System tracks progress
  → ZIP bundle generated when complete
```

## 🔐 Security Features

| Feature | Location | Details |
|---------|----------|---------|
| API Key Auth | `lib/api/validation.ts` | Mobile endpoint requires MOBILE_API_KEY |
| Rate Limiting | `lib/api/validation.ts` | 10 req/min per user (upgradeable to Redis) |
| Input Validation | All endpoints | Required fields, enum, format checks |
| HTTPS Only | Vercel default | All external calls use HTTPS |
| Token Management | `.env.local` | Secrets never in code/git |
| Database Constraints | Schemas | Foreign keys, unique constraints |

## 📈 Scalability

| Component | Current | Bottleneck | Upgrade |
|-----------|---------|-----------|---------|
| Compute | Vercel Hobby | 10s timeout | Vercel Pro (30s) |
| Database | Supabase Hobby | 50K rows/mo | Supabase Pro (500K) |
| Email | SendGrid free | 100/day | SendGrid paid (unlimited) |
| Crons | 2/day limit | Morning-brief + email-secretary | Upgrade plan or local Openclaw |

## 🚀 Deployment Checklist

```bash
□ npm install
□ npm run lint
□ npm run test
□ npm run build
□ Configure .env.local
□ Run database migrations
□ Seed initial data
□ Test each endpoint locally
□ vercel deploy --prod
□ Add env vars to Vercel dashboard
□ Monitor with vercel logs --tail
```

## 📞 Common Tasks

### Add New Quotation Template
```sql
INSERT INTO quotation_templates VALUES (...)
```

### Add New Checklist Type
```sql
INSERT INTO checklist_templates VALUES ('site-type', '[...]'::jsonb)
```

### Test Voice Command
```bash
curl -X POST http://localhost:3000/api/mobile/voice \
  -H "Content-Type: application/json" \
  -d '{"transcript":"...", "userId":"...", "apiKey":"..."}'
```

### View Database
```bash
psql $DATABASE_URL -c "SELECT * FROM quotation_drafts;"
```

### Run Tests
```bash
npm run test -- --watch
```

### Deploy
```bash
vercel deploy --prod
```

## 🎯 Performance Tips

1. **Cache quotation templates** in memory (update on schema change)
2. **Use database indexes** on frequently queried fields
3. **Batch voice result updates** to avoid round-trips
4. **Compress checklist photos** before upload
5. **Monitor Vercel function durations** and optimize hot paths

## 🐛 Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run dev
```

Common debug points:
- API validation errors → `lib/api/validation.ts`
- Database errors → `app/api/*` endpoints
- PDF generation → `lib/pdf/generator.ts`
- Telegram errors → `lib/notifications/telegram.ts`

---

**Total Codebase:** ~3,500 LOC across 20+ files  
**Test Coverage:** 15+ integration tests  
**Documentation:** 6 guides + this index  

For questions, see:
1. **API details** → `ARCHITECTURE.md`
2. **Setup help** → `ADMIN_SETUP.md` or `QUICK_START.md`
3. **Deployment** → `DEPLOYMENT.md`
