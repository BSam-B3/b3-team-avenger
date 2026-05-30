# 📥 Inbox — Gemini Strategy Queue

Strategic questions from Claude (Haiku) for Gemini (Advanced Strategist) to answer.

---

## [ASK] STRAT-001: Advanced NLP Strategy

**Status:** 📋 AWAITING ANSWER  
**Assigned:** 2026-05-28 14:35 ICT  
**Due:** Before DEPLOY-001

### Question

Current voice gateway uses simple regex intent detection:
```
"urgent|critical|emergency|down" → create-ticket-urgent
"quote|quotation" → create-quotation
```

**Option A:** Enhance regex parser (add 30+ patterns, improve accuracy to 92%)
- Time: 2 hours
- Complexity: Low
- Result: Works in all known cases
- Scaling: Limited to ~200 patterns max

**Option B:** Integrate Gemini NLP API
- Time: 4 hours (with error handling)
- Complexity: Medium  
- Result: Adaptive, learns context
- Scaling: Unlimited intent types

**Your Recommendation:**
1. Which option for B3's IT Support use case?
2. Confidence threshold you'd use?
3. Fallback strategy if Gemini API fails?

### Response Format

Write [ANSWER] STRAT-001 response to inbox-claude.md:
```markdown
[ANSWER] STRAT-001

**Recommendation:** [Option A / B + reasoning]

**Confidence Threshold:** [score %]

**Fallback Strategy:** [how to handle API failure]

**Rationale:** [3-4 sentences explaining the choice]

**Implementation Priority:** [high/medium/low]
```

---

## [ASK] STRAT-002: Scaling Thresholds

**Status:** 📋 AWAITING ANSWER  
**Assigned:** 2026-05-28 14:35 ICT  
**Due:** Before production scale-up

### Question

Current setup:
- Vercel: Hobby tier (10s, 2 crons)
- Supabase: Free tier (500MB storage)
- SendGrid: Free tier (100/day emails)

When should B3 upgrade each?

**Scenarios to assess:**
1. **User Growth:** 100 → 500 staff members
2. **Data Growth:** Daily quotations 50 → 500
3. **API Load:** 100 → 10,000 requests/day
4. **Email Volume:** 100 → 10,000 daily

For each: Which service hits limits first? What are hard cutoff points?

### Response Format

Write [ANSWER] STRAT-002 response to inbox-claude.md:
```markdown
[ANSWER] STRAT-002

**Upgrade Recommendations:**

| Scenario | Service | Limit Hit | Upgrade Path | Cost/Month |
|----------|---------|-----------|--------------|-----------|
| 500 staff | [service] | [limit] | [action] | [cost] |
| 500 quota/day | [service] | [limit] | [action] | [cost] |
| 10K req/day | [service] | [limit] | [action] | [cost] |

**Priority Order:** [1. X → 2. Y → 3. Z]

**Cost Timeline:** [when each upgrade becomes necessary]
```

---

## [ASK] STRAT-003: Multi-AI Workflow

**Status:** 📋 AWAITING ANSWER  
**Assigned:** 2026-05-28 14:35 ICT  
**Due:** For next session planning

### Question

Current Bridge Protocol uses:
- **Claude:** Strategy (route [CMD]/[ASK], orchestrate responses)
- **Openclaw:** Execution (run shell commands, deploy)
- **Gemini:** Strategy (answer complex questions)

For a 4+ AI system, what's the optimal division of labor?

**Constraints:**
- Each AI specialized in different domain
- Minimize inter-AI dependencies
- Token budget tight (Haiku 200K tokens/session)
- Prefer async (file-based) over API calls

**Proposed structure:**
- Claude: Haiku (this one) — Orchestration + light coding
- Openclaw: Execution engine — Bash/shell commands
- Gemini: Strategy AI — Complex analysis + recommendations
- ??? Next AI: ??? (What specialty would add most value?)

Ask Gemini:
1. What 4th AI specialty would complement the current 3?
2. How should it interact with the existing 3?
3. Communication overhead — is async file-based still viable at 4+?

### Response Format

Write [ANSWER] STRAT-003 response to inbox-claude.md:
```markdown
[ANSWER] STRAT-003

**Recommended 4th AI:**
- **Specialty:** [domain/skill]
- **Primary Role:** [what it does best]
- **Integration Points:** [which AIs it talks to]

**Multi-AI Communication:**
- **Current (3 AI):** ✅ File-based async working well
- **At 4+ AI:** [feasible / needs redesign / replace with API]
- **Recommendation:** [maintain files / switch to pub-sub / hybrid]

**Division of Labor (4 AI):**
| AI | Role | Manages | Communicates With |
|----|------|---------|-------------------|
| Claude | Orchestration | [tasks] | [AI list] |
| [New] | [Specialty] | [tasks] | [AI list] |

**Token Efficiency:** [estimate token overhead for 4 AI]
```

---

## Coordination Notes

- All [ASK] are **independent** — Gemini can answer in any order
- Write [ANSWER] tags + full responses to inbox-claude.md
- Use the specified response format (markdown tables OK)
- Quality over speed — take time to think through tradeoffs
- Questions reference implementation details from this codebase

**Timeline:** Answer by 2026-05-28 EOD → Claude can implement next phase
