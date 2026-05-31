/**
 * lib/agents/context.ts
 *
 * Agent context loader — Supabase-first, file fallback
 *
 * Priority:
 *   1. Supabase agent_contexts table (writable, works on Vercel)
 *   2. agent-contexts/{AgentId}.md  (fallback + initial source)
 *
 * Raps (HR) writes to Supabase; file system is only read on first load.
 */

import { createClient } from '@supabase/supabase-js'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { searchKnowledge, formatKnowledgeContext } from '@/lib/knowledge/search'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// B3 Profile — โหลดครั้งเดียว ใช้ร่วมกันทุก agent
let _b3Profile: string | null = null
function loadB3Profile(): string {
  if (_b3Profile !== null) return _b3Profile
  try {
    const dir = join(process.cwd(), 'agent-contexts')
    const files = readdirSync(dir)
    const b3File = files.find(f => f.startsWith('B3-Profile'))
    _b3Profile = readFileSync(join(dir, b3File ?? 'B3-Profile.md'), 'utf-8')
  } catch {
    _b3Profile = 'เจ้านายชื่อ B3 (สุรพงษ์) — IT Support ที่ C.I.T. Computer'
  }
  return _b3Profile
}


/**
 * Load context for one agent.
 * LEVEL 0: B3 Profile (shared, always prepended — agents รู้จักเจ้านาย)
 * LEVEL 1: identity .md / DB (always loaded)
 * LEVEL 3: RAG search from agent_knowledge (appended when available)
 */
export async function loadAgentContext(agentId: string, taskHint?: string): Promise<string> {
  // LEVEL 0 — B3 Profile (เจ้านาย) — ทุก agent รู้จัก B3
  const b3Profile = loadB3Profile()

  // LEVEL 1 — Try Supabase DB first
  const { data } = await supabase
    .from('agent_contexts')
    .select('context')
    .eq('agent_id', agentId)
    .single()

  let level1 = ''
  if (data?.context && data.context.trim().length > 10) {
    level1 = data.context
  } else {
    // Fallback to .md file + seed DB async
    level1 = loadFromFile(agentId)
    if (level1.length > 20) {
      void supabase.from('agent_contexts')
        .upsert({ agent_id: agentId, context: level1, updated_by: 'file_seed' })
    }
  }

  const combined = `${b3Profile}\n\n---\n\n${level1}`

  // LEVEL 3 — RAG: search agent_knowledge for relevant chunks
  if (taskHint) {
    const chunks = await searchKnowledge(agentId, taskHint, 3)
    const ragContext = formatKnowledgeContext(chunks)
    if (ragContext) return combined + ragContext
  }

  return combined
}

/**
 * Load all contexts — used by sync endpoint
 */
export async function loadAllContexts(): Promise<Record<string, string>> {
  const AGENT_IDS = [
    'Janie','Joe','Enjoy','Fenton','Karn','Kitti',
    'Nara','Metha','Pim','Win','Nam','Kom','Raps','Ferin',
    'Exploiter','Chief','Finley',
  ]
  const result: Record<string, string> = {}
  await Promise.all(AGENT_IDS.map(async id => {
    result[id] = await loadAgentContext(id)
  }))
  return result
}

/**
 * Save updated context back to Supabase (called by HR/Raps)
 */
export async function saveAgentContext(
  agentId:   string,
  context:   string,
  updatedBy: string = 'Raps'
): Promise<void> {
  await supabase.from('agent_contexts').upsert({
    agent_id:   agentId,
    context,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  })
}

// ─── File loader (sync) ───────────────────────────────────────────────────────

function loadFromFile(agentId: string): string {
  try {
    const dir = join(process.cwd(), 'agent-contexts')
    const files = readdirSync(dir)
    const matchedFile = files.find(f => f === `${agentId}.md` || f.startsWith(`${agentId} (`))
    if (matchedFile) {
      return readFileSync(join(dir, matchedFile), 'utf-8')
    }
    return `คุณคือ ${agentId} สมาชิกทีม B3 Team Avenger`
  } catch {
    return `คุณคือ ${agentId} สมาชิกทีม B3 Team Avenger`
  }
}

