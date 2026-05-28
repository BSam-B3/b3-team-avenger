/**
 * lib/knowledge/embed.ts
 * Gemini text-embedding-004 → 768-dim vectors
 * Used by agent_knowledge table (LEVEL 3 Deep Archive)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY
    if (!key) throw new Error('GEMINI_API_KEY not set — embedding unavailable')
    genAI = new GoogleGenerativeAI(key)
  }
  return genAI
}

export async function embedText(text: string): Promise<number[]> {
  const client = getClient()
  const model  = client.getGenerativeModel({ model: 'text-embedding-004' })
  const result = await model.embedContent(text)
  return result.embedding.values
}

// Split long text into overlapping chunks (for indexing large docs)
export function chunkText(text: string, maxChars = 800, overlap = 100): string[] {
  if (text.length <= maxChars) return [text]
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    chunks.push(text.slice(start, start + maxChars))
    start += maxChars - overlap
  }
  return chunks
}
