/**
 * Web Search utility — ใช้ค้นหาข้อมูลภายนอกเมื่อ agent context ไม่เพียงพอ
 *
 * Priority:
 *   1. Tavily API  (TAVILY_API_KEY)  — best results, structured
 *   2. DuckDuckGo  (no key needed)  — fallback, instant answers
 *
 * .env.local:
 *   TAVILY_API_KEY=tvly-...   ← สมัครฟรีที่ tavily.com (1,000 req/month)
 */

export interface SearchResult {
  title:   string
  snippet: string
  url:     string
}

/**
 * ค้นหาข้อมูลจาก web — returns formatted text สำหรับ inject ใน AI prompt
 */
export async function webSearch(query: string, maxResults = 3): Promise<string> {
  try {
    if (process.env.TAVILY_API_KEY) {
      return await searchTavily(query, maxResults)
    }
    return await searchDuckDuckGo(query)
  } catch (err) {
    console.warn('[search] failed:', err instanceof Error ? err.message : err)
    return ''  // fail silently — agent still responds with base context
  }
}

// ─── Tavily ───────────────────────────────────────────────────────────────────

async function searchTavily(query: string, maxResults: number): Promise<string> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key:      process.env.TAVILY_API_KEY,
      query,
      max_results:  maxResults,
      search_depth: 'basic',
    }),
    signal: AbortSignal.timeout(8000),
  })

  const data = await res.json() as {
    results?: { title: string; content: string; url: string }[]
    error?:   string
  }
  if (!res.ok || !data.results) throw new Error(data.error ?? `Tavily ${res.status}`)

  return data.results
    .slice(0, maxResults)
    .map(r => `**${r.title}**\n${r.content.slice(0, 500)}\n(${r.url})`)
    .join('\n\n')
}

// ─── DuckDuckGo Instant Answer API (no key) ──────────────────────────────────

async function searchDuckDuckGo(query: string): Promise<string> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'B3-TeamAvenger/1.0' },
    signal: AbortSignal.timeout(6000),
  })

  const data = await res.json() as {
    AbstractText?:   string
    Answer?:         string
    RelatedTopics?:  { Text?: string; FirstURL?: string }[]
  }

  const parts: string[] = []
  if (data.AbstractText) parts.push(data.AbstractText)
  if (data.Answer)        parts.push(`คำตอบ: ${data.Answer}`)

  const topics = (data.RelatedTopics ?? [])
    .filter(t => t.Text)
    .slice(0, 3)
    .map(t => t.Text as string)

  parts.push(...topics)

  return parts.length > 0 ? parts.join('\n\n') : ''
}

/**
 * ตรวจว่าควร search ไหม — ถ้า context สั้น หรือ task ถามเรื่องนอกองค์กร
 */
export function shouldSearch(context: string, taskDetail: string): boolean {
  const shortContext = context.trim().length < 300
  const keywords = ['ค้นหา', 'หาข้อมูล', 'research', 'trend', 'ราคา', 'ข่าว', 'เทรนด์',
                    'ล่าสุด', 'ปัจจุบัน', 'search', 'find', 'market', 'competitor', 'คู่แข่ง']
  const taskNeedsSearch = keywords.some(kw => taskDetail.toLowerCase().includes(kw))
  return shortContext || taskNeedsSearch
}
