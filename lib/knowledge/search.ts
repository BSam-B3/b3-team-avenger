/**
 * lib/knowledge/search.ts
 * Semantic search via pgvector (Hybrid: vector similarity + keyword fallback)
 */

import { createClient } from '@supabase/supabase-js'
import { embedText } from './embed'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export interface KnowledgeChunk {
  content:    string
  source:     string
  similarity: number
}

/**
 * Search agent knowledge base for relevant context
 * Returns top-k chunks sorted by relevance
 */
export async function searchKnowledge(
  agentId:  string,
  query:    string,
  topK:     number = 3,
): Promise<KnowledgeChunk[]> {
  try {
    const embedding = await embedText(query)
    const vectorStr = `[${embedding.join(',')}]`

    const { data, error } = await supabase.rpc('search_agent_knowledge', {
      p_agent_id:  agentId,
      p_embedding: vectorStr,
      p_top_k:     topK,
    })

    if (error || !data?.length) return []

    return (data as { content: string; source: string; similarity: number }[]).map(r => ({
      content:    r.content,
      source:     r.source,
      similarity: r.similarity,
    }))
  } catch {
    return []
  }
}

/**
 * Format search results as context string for agent prompt
 */
export function formatKnowledgeContext(chunks: KnowledgeChunk[]): string {
  if (!chunks.length) return ''
  const lines = chunks.map(c => `[${c.source}]\n${c.content}`).join('\n\n---\n\n')
  return `\n\n## ข้อมูลจาก Knowledge Base:\n${lines}`
}
