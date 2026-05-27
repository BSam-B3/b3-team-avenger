/**
 * GET /api/usage/stats
 *
 * ดึง token/cost statistics จาก api_usage_logs
 *
 * Returns:
 *   { totals, byBackend, byAgent, recent, lastUpdated }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET() {
  try {
    // All-time totals
    const { data: rows } = await supabase
      .from('api_usage_logs')
      .select('backend, tokens_in, tokens_out, cost_usd, agent_id, created_at')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (!rows?.length) {
      return NextResponse.json({
        totals:      { calls: 0, tokensIn: 0, tokensOut: 0, costUsd: 0 },
        byBackend:   {},
        byAgent:     {},
        recent:      [],
        lastUpdated: new Date().toISOString(),
      })
    }

    // Aggregate totals
    const totals = rows.reduce(
      (acc, r) => ({
        calls:    acc.calls + 1,
        tokensIn:  acc.tokensIn  + (r.tokens_in  ?? 0),
        tokensOut: acc.tokensOut + (r.tokens_out ?? 0),
        costUsd:   acc.costUsd   + (r.cost_usd   ?? 0),
      }),
      { calls: 0, tokensIn: 0, tokensOut: 0, costUsd: 0 }
    )

    // By backend
    const byBackend: Record<string, { calls: number; tokensIn: number; tokensOut: number; costUsd: number }> = {}
    for (const r of rows) {
      const b = r.backend as string
      if (!byBackend[b]) byBackend[b] = { calls: 0, tokensIn: 0, tokensOut: 0, costUsd: 0 }
      byBackend[b].calls++
      byBackend[b].tokensIn  += r.tokens_in  ?? 0
      byBackend[b].tokensOut += r.tokens_out ?? 0
      byBackend[b].costUsd   += r.cost_usd   ?? 0
    }

    // By agent (top 14)
    const byAgentMap: Record<string, { calls: number; tokensIn: number; tokensOut: number; costUsd: number }> = {}
    for (const r of rows) {
      const a = r.agent_id as string
      if (!a) continue
      if (!byAgentMap[a]) byAgentMap[a] = { calls: 0, tokensIn: 0, tokensOut: 0, costUsd: 0 }
      byAgentMap[a].calls++
      byAgentMap[a].tokensIn  += r.tokens_in  ?? 0
      byAgentMap[a].tokensOut += r.tokens_out ?? 0
      byAgentMap[a].costUsd   += r.cost_usd   ?? 0
    }
    const byAgent = Object.fromEntries(
      Object.entries(byAgentMap).sort((a, b) => b[1].costUsd - a[1].costUsd).slice(0, 14)
    )

    // Recent 10 calls
    const recent = rows.slice(0, 10).map(r => ({
      agent:     r.agent_id,
      backend:   r.backend,
      tokensIn:  r.tokens_in  ?? 0,
      tokensOut: r.tokens_out ?? 0,
      costUsd:   r.cost_usd   ?? 0,
      at:        r.created_at,
    }))

    return NextResponse.json({
      totals: {
        ...totals,
        costUsd: Math.round(totals.costUsd * 1_000_000) / 1_000_000,  // 6 decimal places
      },
      byBackend,
      byAgent,
      recent,
      lastUpdated: new Date().toISOString(),
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
