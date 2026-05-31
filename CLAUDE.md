# 🚨 CLAUDE CODE - MANDATORY WORKSPACE INSTRUCTIONS 🚨
# COOPERATIVE AGENT RULES: GEMINI (GEM) & CLAUDE CODE

You are running in คุณบีสาม's (B3) Dell Machine. GEM (Gemini) acts as the Lead System Architect. You act as the Master Developer. To avoid system conflicts, token waste, and redundant code, you MUST follow these hard-coded rules:

---

## 1. MANDATORY INITIAL ACTION (ON EVERY USER PROMPT)
Before you run ANY command, search files, or write any code:
1.  **Open and Read** [BRIDGE_TASK.md](file:///c:/Users/PC/Desktop/b3-team-avenger/BRIDGE_TASK.md) at the project root directly. Do NOT use search/glob tools to find it. Open it directly.
2.  **Open and Read** [Orchestration Rules](file:///c:/Users/PC/Desktop/b3-team-avenger/agent-contexts/orchestration-rules.md) to understand current scope, ownership boundaries, and architecture protocols.

---

## 2. STRICT BUDGET & RESOURCE RULES
*   **M365 Copilot First:** For image/asset generation, B3 uses M365 Business Standard (Copilot DALL-E 3). Never write code that integrates paid asset APIs without approval.
*   **Free-Tier Limit:** All database instances (Supabase, Firebase), hosting (Vercel, Cloudflare), and integrations MUST be designed strictly within their FREE TIERS.
*   **Zero Cost Toleration:** Never pull external libraries, paid cloud products, or API services that charge a fee unless explicitly instructed. The "Jong Jaroen" project goes live NEXT YEAR; no paid services allowed until then.

---

## 3. BRIDGE PROTOCOL WORKFLOW
*   Read `BRIDGE_TASK.md`. Find section marked `[STATUS] PENDING` or `[STATUS] IN_PROGRESS`.
*   Execute the DDL, migrations, configurations, and file modifications exactly as specified by GEM.
*   Run local tests (`npm run build` or target test files) to verify execution.
*   Upon successful verification, update the task status to `[COMPLETED]` in `BRIDGE_TASK.md` and report back to B3.

---

## 4. MINI-PROJECT (.md) LIFECYCLE & CLEANUP PROTOCOL
*   **Divide & Conquer:** Never code massive features in a single run. Break work into small "Mini-Projects".
*   **Draft Files:** Create temporary `/agent-contexts/mini-project-[name]-draft.md` for specs during active coding.
*   **Merge & Purge:** Once working perfectly, move notes to a permanent `/agent-contexts/mini-project-[name]-completed.md` and **IMMEDIATELY DELETE/PURGE the draft files** to keep the workspace clean and save context tokens.
*   **Compact Logs:** Append concise, technical execution logs to the shared log files. No verbose chatter.

---

## 5. CROSS-AGENT HANDOVER REQUESTS (GEM ⇄ CLAUDE)
*   **GEM to Claude:** Check the bottom of `BRIDGE_TASK.md` for specific instructions under `📌 GEM'S REQUEST FOR CLAUDE:`.
*   **Claude to GEM:** If you need database scaling, research, or design decisions for the next phase, write your queries under `📌 CLAUDE'S REQUEST FOR GEM:` at the bottom of the completed task.
*   **Status Signals:** Keep the `[STATUS]` tag in `BRIDGE_TASK.md` updated (`[IN_PROGRESS]`, `[COMPLETED]`) to allow seamless workflow handovers.

---

## 6. COMMAND CHEATSHEET
*   **Run Dev Server:** `npm run dev`
*   **Verify Builds:** `npm run build`
*   **Execute Test Suite:** `npm test`


