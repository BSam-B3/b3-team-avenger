/**
 * PATCH /api/jarvis/item
 *
 * Mark checklist item complete + upload photo
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface UpdateItemRequest {
  itemId: string
  status: 'done' | 'na' | 'pending'
  notes?: string
  photoUrl?: string
}

export async function PATCH(req: NextRequest) {
  try {
    const body: UpdateItemRequest = await req.json()
    const { itemId, status, notes, photoUrl } = body

    if (!itemId || !status) {
      return NextResponse.json({ error: 'itemId and status required' }, { status: 400 })
    }

    // ─── Validate status ────────────────────────────────────────────────────
    if (!['done', 'na', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // ─── Update item ────────────────────────────────────────────────────────
    const { data: item } = await supabase
      .from('checklist_items')
      .update({
        status,
        notes,
        photo_url: photoUrl,
      })
      .eq('id', itemId)
      .select('id')
      .single()

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      itemId,
      status,
      photoUrl,
    })
  } catch (err) {
    console.error('[jarvis/item error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
