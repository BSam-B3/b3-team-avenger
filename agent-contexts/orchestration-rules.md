# 🌉 Avenger Orchestration Rules (GEM & Claude Code)

This file contains the strict rules for synchronization and handshakes between **GEM (Gemini - Architect)** and **Claude Code (Developer)** within คุณบีสาม's (B3) workspace. Both agents must read and adhere to these protocols.

---

## 1. Role Definitions & Ownership
*   **GEM (Gemini):** System Architect, Planner, UI/UX Designer, and Quality Assurance (QA).
    *   *Deliverables:* System designs, API specs, database schemas, prompt briefs, and user validation guides.
    *   *Workspace Authority:* Author of `BRIDGE_TASK.md`.
*   **Claude Code:** Master Builder, Execution Engineer, Terminal Operator, and Git Administrator.
    *   *Deliverables:* Clean production code, API endpoints, tests execution, and CLI command operations.
    *   *Workspace Authority:* Actioning items listed in `BRIDGE_TASK.md` and maintaining `CLAUDE.md`.

---

## 2. The Bridge Communication Protocol (Sync via Files)
To prevent out-of-sync edits and maximize token efficiency, communication occurs through **`BRIDGE_TASK.md`** at the workspace root.

```
       [ B3 (User) Command ]
             │         │
             ▼         ▼
     ┌───────────┐ ┌─────────────┐
     │    GEM    │ │ Claude Code │
     └─────┬─────┘ └──────┬──────┘
           │ Writes       │ Reads / Updates
           ▼              ▼
     ┌───────────────────────────┐
     │      BRIDGE_TASK.md       │
     └───────────────────────────┘
```

### Protocol Steps:
1.  **Creation/Design Phase (GEM):**
    *   When the user asks GEM to design a feature, GEM designs it and writes the precise roadmap directly into `BRIDGE_TASK.md` with status `[PENDING]`.
2.  **Execution Phase (Claude Code):**
    *   When the user triggers Claude Code (or if Claude reads a pending `BRIDGE_TASK.md`), Claude reads the roadmap, changes the status to `[IN_PROGRESS]`, and carries out the file modifications, shell builds, and unit tests exactly as described.
3.  **Completion Phase (Claude Code):**
    *   Once execution succeeds and tests pass, Claude updates the status in `BRIDGE_TASK.md` to `[COMPLETED]` and summarizes the changes under the "Accomplishments" section.
4.  **Feedback/Verification Phase (GEM):**
    *   GEM reviews the completed work, verifies the architecture, and closes the task with `[CLOSED]`.

---

## 3. General Agent Cooperation Standards
*   **No Code Overwrites:** Claude Code should respect architecture choices set by GEM. If a technical barrier arises, Claude updates `BRIDGE_TASK.md` under "Open Technical Questions" so GEM can resolve the design.
*   **Token Optimization:** Never exchange verbose pleasantries in the bridge file. Keep instructions, specifications, and comments technical, highly dense, and concise (Strict Token-Saving).
*   **Self-Correction:** If Claude encounters error outputs in terminal execution, Claude must fix them autonomously before declaring a task `[COMPLETED]`.

---

## 4. B3's Budget Constraints & Resource Optimization Guidelines (CRITICAL)
This project operates under strict financial constraints. We will not generate real revenue until the **"Jong Jaroen" (จงเจริญ)** project officially launches **next year**. Both agents must strictly adhere to the following rules:

*   **Rule of Subscribed Assets (Use What We Already Pay For):**
    *   Prioritize assets B3 already pays for: **Microsoft 365 Business Standard (which includes Copilot/DALL-E 3)**.
    *   Utilize local computing resources (Dell machine) and active IDE tooling.
*   **Rule of Free-Tier First:**
    *   When choosing database structures, hosting, or third-party APIs (e.g., Supabase, Vercel, Cloudflare, Google Cloud, Firebase), **always default to the Free Tier** and design within its limits.
*   **No Unapproved Spending:**
    *   **NEVER** write code or recommend architectures that trigger immediate paywalls, premium subscriptions, or API usage costs without B3's explicit prior written approval.
*   **Proposal for Paid Additions:**
    *   If a paid service/tool is absolutely necessary to resolve a critical technical barrier, the agent must write a formal request in `BRIDGE_TASK.md` detailing:
        1. Why the free tier/existing tools are insufficient.
        2. Exact projected monthly/yearly costs in Thai Baht (THB).
        3. Alternative options and trade-offs.
        *Wait for B3's explicit decision before writing any dependent code.*

---

## 5. Mini-Project (.md) Lifecycle & Log Management (Token Optimization)
To prevent token limits overflow, massive codebase errors, and system pollution:

*   **Rule of Incremental Builds (Mini-Projects):**
    *   Do NOT build massive features all at once. Break down every task into small, isolated **"Mini-Projects"** (e.g., specific schema setup, single API routing, simple button component).
    *   For every Mini-Project in progress, create a temporary **Draft File** named `/agent-contexts/mini-project-[name]-draft.md` to map out immediate parameters, files, and isolated variables.
*   **Merge & Garbage Cleanup:**
    *   Once a Mini-Project is tested, fully functional, and working perfectly, document it as completed inside a permanent log file `/agent-contexts/mini-project-[name]-completed.md`.
    *   **IMMEDIATELY delete/clear all draft files (`*-draft.md`)** and associated temp files to remove garbage/clutter from the project directory.
    *   When multiple completed Mini-Projects exist, compile their architectural data into the master `ARCHITECTURE.md` or main documentation as a single source of truth.
*   **Audit & Co-working Logs:**
    *   Always append major steps taken, decisions, and system verification results to a shared co-working log. Keep logs strictly structured, factual, and extremely concise to preserve context window tokens.

---

## 6. Cross-Agent Delegation & Handover Protocol (GEM ⇄ Claude Code)
To establish a fully autonomous cooperative feedback loop, both agents must utilize the handover protocol in `BRIDGE_TASK.md`:

*   **Status Signals:** Both agents must keep the `[STATUS]` tag updated to reflect the workflow state:
    *   `[STATUS] PENDING` - GEM has written the spec, awaiting Claude's action.
    *   `[STATUS] IN_PROGRESS` - Claude has acknowledged and is actively coding/running tests.
    *   `[STATUS] COMPLETED` - Claude finished coding and testing, awaiting GEM's QA review.
    *   `[STATUS] CLOSED` - GEM verified the changes and marked the task closed with B3.
*   **The Handover Requests:**
    *   **GEM to Claude:** GEM writes specific implementation requests at the bottom of the pending task under `📌 GEM'S REQUEST FOR CLAUDE: [instructions]`.
    *   **Claude to GEM:** If Claude finishes execution but requires planning, caching, or research for the next step, Claude writes a request under `📌 CLAUDE'S REQUEST FOR GEM: [questions/research topics]`.
    *   *Rule:* Each agent must actively look for and address these request blocks on every workspace interaction.



