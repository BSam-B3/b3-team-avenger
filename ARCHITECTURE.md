# B3 Avenger — System Architecture

Complete system design and data flow documentation.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │ Microsoft   │  │   SendGrid   │  │   Telegram API     │     │
│  │   Graph     │  │              │  │                    │     │
│  │  (OAuth2)   │  │   Email      │  │  (Push Alerts)     │     │
│  └──────┬──────┘  └──────┬───────┘  └────────┬───────────┘     │
│         │                 │                   │                  │
└─────────┼─────────────────┼───────────────────┼──────────────────┘
          │                 │                   │
┌─────────┼─────────────────┼───────────────────┼──────────────────┐
│         │      VERCEL EDGE (Next.js)          │                  │
├─────────┼─────────────────┼───────────────────┼──────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │          API ENDPOINTS (app/api/)                    │       │
│  ├──────────────────────────────────────────────────────┤       │
│  │                                                       │       │
│  │  WORKERS (CRONS)                                     │       │
│  │  • morning-brief (08:00 ICT)                         │       │
│  │  • email-secretary (09:00 ICT)                       │       │
│  │                                                       │       │
│  │  QUOTATION SYSTEM                                    │       │
│  │  • POST /quotation/create-draft  → boss approval     │       │
│  │  • POST /quotation/approve       → PDF + email       │       │
│  │  • POST /quotation/reject        → notify seller     │       │
│  │                                                       │       │
│  │  MOBILE VOICE                                        │       │
│  │  • POST /mobile/voice            → intent parser     │       │
│  │  • POST /mobile/confirm          → execute action    │       │
│  │                                                       │       │
│  │  IT JARVIS                                           │       │
│  │  • POST /jarvis/checklist        → create checklist  │       │
│  │  • PATCH /jarvis/item            → mark done + photo │       │
│  │  • POST /jarvis/complete         → bundle + email    │       │
│  │                                                       │       │
│  │  DOCUMENT GENERATION                                 │       │
│  │  • POST /pdf/generate-report     → PDF generation    │       │
│  │                                                       │       │
│  └──────────────────────────────────────────────────────┘       │
│                         │                                         │
├─────────────────────────┼─────────────────────────────────────────┤
│                         ▼                                         │
│               SUPABASE (PostgreSQL)                              │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ quotation    │  │ voice_       │  │ onsite_      │           │
│  │ _templates   │  │ commands     │  │ checklists   │           │
│  │              │  │              │  │              │           │
│  │ + vendor_db  │  │ + voice_     │  │ + checklist_ │           │
│  │              │  │ results      │  │ items        │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   CLIENT (Dashboard/Mobile)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Pages (fetch from /api/):                                       │
│  • / (main dashboard) — office status                            │
│  • /quotation — drafts + approval status                         │
│  • /mobile — voice command history                               │
│  • /jarvis — checklist progress                                  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow: Quotation System

```
User (Salesperson)
    │
    ▼
[/api/quotation/create-draft] ← POST { customerId, templateId, markup }
    │
    ├─ Validate inputs
    ├─ Load template (base_cost)
    ├─ Calculate: total = base_cost × (1 + markup/100)
    ├─ Insert quotation_drafts { status: 'draft', total_cost }
    │
    ├─ [TELEGRAM] Send boss approval button
    │    → Button: [✅ Approve] [❌ Reject]
    │
    ▼
[Boss clicks Approve on Telegram]
    │
    ▼
[/api/quotation/approve] ← POST { quotationId, approverId }
    │
    ├─ Load draft + customer email
    ├─ Update status → 'approved'
    ├─ Generate PDF (pdf-lib)
    ├─ Upload to SharePoint (Graph API)
    ├─ Send email (SendGrid)
    ├─ Update status → 'sent'
    │
    ├─ [TELEGRAM] Confirm: "✅ Quotation approved & sent to customer"
    │
    ▼
[/quotation dashboard] ← Shows status 'sent'
```

## Data Flow: Mobile Voice Gateway

```
Phone (S26 Ultra / Gemini app)
    │
    ├─ Voice recording
    ├─ Gemini transcription
    │
    ▼
[POST /api/mobile/voice] ← { transcript, userId, apiKey }
    │
    ├─ Validate API key
    ├─ Parse intent (regex-based):
    │  • "create.*ticket|issue|problem" → create-ticket
    │  • "quote|quotation|proposal" → create-quotation
    │  • "email|mail|unread" → check-email
    │  • "brief|morning|schedule" → fetch-brief
    │  • "status|progress" → check-status
    │
    ├─ Insert voice_commands { intent, transcript, status: 'pending' }
    │
    ├─ For "create" intents: send confirmation
    │    [POST /api/mobile/confirm] ← user approval required
    │
    ├─ For "check" intents: execute immediately
    │    • check-email → fetch M365 unread count
    │    • fetch-brief → summarize calendar + tickets
    │
    ├─ Insert voice_results { status, action_taken }
    │
    ├─ [TELEGRAM] Brief alert (lock-screen safe)
    │    • "📧 4 unread emails"
    │    • "☀️ 2 meetings today"
    │
    ▼
[/mobile dashboard] ← Shows command history
```

## Data Flow: IT Jarvis Checklist

```
Technician (field)
    │
    ▼
[POST /api/jarvis/checklist] ← { technicianId, customerId, siteType }
    │
    ├─ Load template by siteType
    │  e.g., 'on-site-server' → ["CPU Status", "RAM Check", ...]
    │
    ├─ Create onsite_checklists { status: 'in_progress' }
    ├─ Create checklist_items { status: 'pending' for each item }
    │
    ├─ Return checklist details (items + URLs to photos)
    │
    ▼
Technician marks items done
    │
    ├─ [PATCH /api/jarvis/item]
    │  • { itemId, status: 'done'|'na'|'pending', photoUrl, notes }
    │
    ├─ Update checklist_items record
    │
    ▼
All items complete
    │
    ▼
[POST /api/jarvis/complete] ← { checklistId }
    │
    ├─ Update status → 'completed'
    ├─ Generate ZIP bundle (photos + report)
    ├─ Email to customer (or store in SharePoint)
    │
    ├─ [TELEGRAM] Notify IT team:
    │    • "✅ Checklist complete: ACME Corp Server"
    │    • "📦 ZIP ready for download"
    │
    ▼
[/jarvis dashboard] ← Shows progress 100%
```

## Database Schema

### Quotation Tables

```sql
quotation_templates
├─ id (PK)
├─ name (unique)
├─ solution_type (e.g., 'upgrade-hardware')
├─ base_cost (numeric)
└─ description

vendor_db
├─ id (PK)
├─ vendor_name
├─ product
├─ unit_cost
└─ lead_time_days

quotation_drafts
├─ id (PK)
├─ customer_id (FK)
├─ template_id (FK)
├─ sales_person_id
├─ markup_pct
├─ total_cost (GENERATED AS base_cost * (1 + markup_pct/100))
├─ status (draft|pending_approval|approved|rejected|sent)
├─ approver_id
├─ created_at
└─ updated_at
```

### Mobile Voice Tables

```sql
voice_commands
├─ id (PK)
├─ user_id
├─ transcript
├─ intent (detected intent)
├─ parameters (JSONB)
├─ created_at

voice_results
├─ id (PK)
├─ command_id (FK)
├─ status (pending|success|failed|confirmed)
├─ action_taken
├─ result_data (JSONB)
└─ created_at
```

### IT Jarvis Tables

```sql
checklist_templates
├─ id (PK)
├─ site_type (unique)
└─ items (JSONB array with name, category)

onsite_checklists
├─ id (PK)
├─ technician_id
├─ customer_id
├─ site_type
├─ status (draft|in_progress|completed)
├─ created_at
└─ completed_at

checklist_items
├─ id (PK)
├─ checklist_id (FK)
├─ item_name
├─ status (pending|done|na)
├─ photo_url
├─ notes
├─ created_at
└─ updated_at
```

## Security Model

### Authentication

| Endpoint | Auth Method | Key Location |
|----------|-------------|--------------|
| `/api/mobile/voice` | API Key | `MOBILE_API_KEY` in header |
| `/api/quotation/*` | Internal (Vercel) | N/A (backend only) |
| `/api/jarvis/*` | Internal (Vercel) | N/A (backend only) |
| `/api/workers/*` | Vercel cron auth | N/A (auto-verified) |

### Data Protection

- **Quotation PDFs:** Uploaded to SharePoint (encrypted in transit via HTTPS)
- **Checklist photos:** Stored as URLs (implement S3 for encryption)
- **API calls:** HTTPS TLS 1.3
- **Database:** Supabase (encrypted at rest)
- **Tokens:** Rotated regularly, stored in `.env.local` (not in git)

### Rate Limiting

- Mobile voice endpoint: 10 req/minute per user
- Quotation creation: 20 per day per salesperson
- Checklist updates: 100 per day per technician

## Scalability Considerations

### Current Limits

- **Vercel:** 10s timeout (PDF generation may exceed)
- **Supabase (Hobby):** 50,000 rows per month
- **SendGrid:** 100 emails/day (free tier)
- **Telegram:** Unlimited (rate limiting: 1 msg/sec per chat)

### Upgrade Path

| Component | Hobby | Pro | Enterprise |
|-----------|-------|-----|------------|
| **Vercel** | 10s timeout | 30s timeout | Custom |
| **Supabase** | 50K rows/mo | 500K rows/mo | Unlimited |
| **SendGrid** | 100/day | Unlimited | Unlimited |
| **Cost/month** | $0-20 | $50 | $500+ |

### Optimization Strategies

1. **PDF generation:** Move heavy PDFs to local Openclaw worker
2. **Database:** Add read replicas for dashboard queries
3. **Caching:** Redis for quotation templates + vendor DB
4. **Async jobs:** Queue with Supabase functions for heavy operations
5. **Monitoring:** Set up Sentry for error tracking

## Integration Points

### External APIs

| Service | Purpose | Auth | Endpoint |
|---------|---------|------|----------|
| Microsoft Graph | SharePoint + Email | OAuth2 | graph.microsoft.com |
| SendGrid | Email delivery | API Key | api.sendgrid.com |
| Telegram | Notifications | Bot Token | api.telegram.org |
| Supabase | Database | Service Key | supabase.co |

### Internal Services

- **Openclaw Gateway:** Local file/shell execution (ws://127.0.0.1:18789)
- **Bridge Protocol:** AI-to-AI coordination via inbox files
- **Knowledge Base:** Shared learnings (markdown + JSON)

---

**Last Updated:** 2026-05-28  
**Version:** 1.0  
**Status:** PRODUCTION
