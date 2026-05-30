// TIER 5: Admin Panel - Template Management
// Features:
// - Create/update quotation templates
// - Manage vendor database
// - Bulk operations

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateRequiredFields, createErrorResponse, createSuccessResponse } from '@/lib/api/validation'
import { cacheDelete, CACHE_KEYS } from '@/lib/cache/redis-client'
import { logError } from '@/lib/logging/error-tracker'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Admin key validation
function validateAdminKey(key: string | null): boolean {
  const adminKey = process.env.ADMIN_API_KEY
  return !!(adminKey && key === adminKey)
}

// GET: List templates/vendors
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const adminKey = authHeader?.replace('Bearer ', '') ?? null

    if (!validateAdminKey(adminKey)) {
      return createErrorResponse(
        {
          code: 'UNAUTHORIZED',
          message: 'Invalid admin key',
          status: 401,
        }
      )
    }

    const action = req.nextUrl.searchParams.get('action') || 'templates'

    if (action === 'templates') {
      const { data, error } = await supabase.from('quotation_templates').select().order('name')

      if (error) throw error

      return createSuccessResponse({ templates: data, count: data?.length || 0 })
    }

    if (action === 'vendors') {
      const { data, error } = await supabase.from('vendor_db').select().order('vendor_name')

      if (error) throw error

      return createSuccessResponse({ vendors: data, count: data?.length || 0 })
    }

    return createErrorResponse(
      {
        code: 'INVALID_FIELD',
        message: 'Invalid action',
        status: 400,
      }
    )
  } catch (err) {
    console.error('[admin] get error:', err)
    await logError({
      endpoint: '/api/tier5/admin/templates',
      method: 'GET',
      status: 500,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      severity: 'error',
    })
    return createErrorResponse(
      {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        status: 500,
      }
    )
  }
}

// POST: Create template/vendor
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const adminKey = authHeader?.replace('Bearer ', '') ?? null

    if (!validateAdminKey(adminKey)) {
      return createErrorResponse(
        {
          code: 'UNAUTHORIZED',
          message: 'Invalid admin key',
          status: 401,
        }
      )
    }

    const body = await req.json()
    const action = body.action || 'template'

    if (action === 'template') {
      const missingField = validateRequiredFields(body, ['name', 'solution_type', 'base_cost'])
      if (missingField) {
        return createErrorResponse(
          {
            code: 'MISSING_FIELD',
            message: `Missing required field: ${missingField}`,
            status: 400,
          }
        )
      }

      const { data, error } = await supabase
        .from('quotation_templates')
        .insert([body])
        .select()
        .single()

      if (error) throw error

      // Invalidate cache
      await cacheDelete(CACHE_KEYS.QUOTATION_TEMPLATES)

      return createSuccessResponse({ template: data }, 201)
    }

    if (action === 'vendor') {
      const missingField = validateRequiredFields(body, ['vendor_name', 'product', 'unit_cost'])
      if (missingField) {
        return createErrorResponse(
          {
            code: 'MISSING_FIELD',
            message: `Missing required field: ${missingField}`,
            status: 400,
          }
        )
      }

      const { data, error } = await supabase
        .from('vendor_db')
        .insert([body])
        .select()
        .single()

      if (error) throw error

      // Invalidate cache
      await cacheDelete(CACHE_KEYS.VENDOR_DB)

      return createSuccessResponse({ vendor: data }, 201)
    }

    return createErrorResponse(
      {
        code: 'INVALID_FIELD',
        message: 'Invalid action',
        status: 400,
      }
    )
  } catch (err) {
    console.error('[admin] post error:', err)
    await logError({
      endpoint: '/api/tier5/admin/templates',
      method: 'POST',
      status: 500,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      severity: 'error',
    })
    return createErrorResponse(
      {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        status: 500,
      }
    )
  }
}

// PATCH: Update template/vendor
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const adminKey = authHeader?.replace('Bearer ', '') ?? null

    if (!validateAdminKey(adminKey)) {
      return createErrorResponse(
        {
          code: 'UNAUTHORIZED',
          message: 'Invalid admin key',
          status: 401,
        }
      )
    }

    const body = await req.json()
    const { id, action, ...updates } = body

    if (!id) {
      return createErrorResponse(
        {
          code: 'MISSING_FIELD',
          message: 'ID required',
          status: 400,
        }
      )
    }

    if (action === 'template') {
      const { data, error } = await supabase
        .from('quotation_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await cacheDelete(CACHE_KEYS.QUOTATION_TEMPLATES)
      await cacheDelete(CACHE_KEYS.QUOTATION_TEMPLATE_BY_ID(id))

      return createSuccessResponse({ template: data })
    }

    if (action === 'vendor') {
      const { data, error } = await supabase
        .from('vendor_db')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await cacheDelete(CACHE_KEYS.VENDOR_DB)
      await cacheDelete(CACHE_KEYS.VENDOR_BY_ID(id))

      return createSuccessResponse({ vendor: data })
    }

    return createErrorResponse(
      {
        code: 'INVALID_FIELD',
        message: 'Invalid action',
        status: 400,
      }
    )
  } catch (err) {
    console.error('[admin] patch error:', err)
    await logError({
      endpoint: '/api/tier5/admin/templates',
      method: 'PATCH',
      status: 500,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      severity: 'error',
    })
    return createErrorResponse(
      {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        status: 500,
      }
    )
  }
}
