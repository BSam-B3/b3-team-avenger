# 📥 Inbox — Openclaw Task Queue

Commands from Claude (Strategy AI) for Openclaw (File Executor) to execute.

---

## [CMD] MIG-001: Database Migration

**Status:** ✅ DONE  
**Assigned:** 2026-05-28 14:35 ICT  
**Completed:** 2026-05-28 14:45 ICT  
**Executor:** Claude (using Supabase MCP)

### Tasks
- ✅ Create quotation_templates table + seed 7 templates
- ✅ Create vendor_db table + seed 8 vendors
- ✅ Create quotation_drafts table (transactional)
- ✅ Create voice_commands table (voice gateway)
- ✅ Create voice_results table (results tracking)
- ✅ Create checklist_templates table + seed 4 types
- ✅ Create onsite_checklists table
- ✅ Create checklist_items table
- ✅ Apply 14 performance indexes
- ✅ Verify schema integrity

**Result:** 8 tables, 14 indexes, 20 seed records ✅

---

## [CMD] DEPLOY-001: Vercel Deployment Preparation

**Status:** 📋 AWAITING EXECUTION  
**Assigned:** 2026-05-28 14:35 ICT  
**Success Criteria:** All checks pass, build artifact generated

### Tasks
1. `npm install` — Verify all dependencies resolve
2. `npm run lint` — TypeScript + ESLint checks
3. `npm run test` — Jest integration test suite
4. `npm run build` — Next.js production build
5. Verify `.next/` folder created
6. Check no build errors in output

**Expected Output:**
```
✓ npm install completed
✓ eslint: 0 errors
✓ jest: all tests passed
✓ next.js: Build complete, 187 files
```

**Response Format:** Write [DONE] DEPLOY-001 with status/output to inbox-claude.md

---

## [CMD] PERF-001: Performance Verification

**Status:** 📋 AWAITING EXECUTION  
**Assigned:** 2026-05-28 14:35 ICT  
**Success Criteria:** Config validated, caching ready

### Tasks
1. Verify Redis connection (if REDIS_URL set)
   - `redis-cli ping` → PONG
2. Verify Sentry DSN
   - Check SENTRY_DSN format: https://key@sentry.io/id
   - Validate in sentry.ts import
3. Test cache functions
   - `cacheOrFetch()` with mock data
   - Verify MEDIUM TTL = 600s
4. Check environment variables
   - ADMIN_API_KEY set and ≥20 chars
   - SUPABASE_SERVICE_ROLE_KEY valid

**Expected Output:**
```
✓ Redis: ready (or in-memory fallback)
✓ Sentry: DSN valid
✓ Cache: working (TTL verified)
✓ Admin key: configured
```

**Response Format:** Write [DONE] PERF-001 with status to inbox-claude.md

---

## Coordination Notes

- All [CMD] tasks are **independent** — can execute in parallel
- Each [CMD] must write [DONE] tag + full output to inbox-claude.md
- Use compact format: status + brief output + success/fail
- If any task fails, write [FAIL] tag + error message
- Next phase (DEPLOY) waits for all [DONE] signals

**Timeline:** Once all [DONE] signals received → claude coordin phase 2
