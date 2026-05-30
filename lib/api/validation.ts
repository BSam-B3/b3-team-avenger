// Common API validation and error responses
import { NextResponse } from 'next/server'

export interface ApiError {
  code: string
  message: string
  status: number
}

export const ApiErrors = {
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: 'Unauthorized', status: 401 },
  BAD_REQUEST: { code: 'BAD_REQUEST', message: 'Bad request', status: 400 },
  NOT_FOUND: { code: 'NOT_FOUND', message: 'Not found', status: 404 },
  CONFLICT: { code: 'CONFLICT', message: 'Conflict', status: 409 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: 'Internal server error', status: 500 },
  INVALID_API_KEY: { code: 'INVALID_API_KEY', message: 'Invalid API key', status: 401 },
  MISSING_FIELD: (field: string) => ({
    code: 'MISSING_FIELD',
    message: `Missing required field: ${field}`,
    status: 400,
  }),
  INVALID_FIELD: (field: string, reason: string) => ({
    code: 'INVALID_FIELD',
    message: `Invalid field '${field}': ${reason}`,
    status: 400,
  }),
}

export function createErrorResponse(error: ApiError, details?: string) {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(details && { details }),
      },
    },
    { status: error.status }
  )
}

export function createSuccessResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

// API key validation
export function validateApiKey(provided: string | undefined, expected: string): boolean {
  if (!provided || !expected) return false
  return provided === expected
}

// Request validation helpers
export function validateRequiredFields(body: any, fields: string[]): string | null {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return field
    }
  }
  return null
}

export function validateEnum(value: any, allowed: string[]): boolean {
  return allowed.includes(value)
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validateMarkupPercentage(markup: number): boolean {
  return markup >= 0 && markup <= 100
}

export function validatePhoneNumber(phone: string): boolean {
  return /^[\d\s\-+()]{7,}$/.test(phone.replace(/\s/g, ''))
}

// Database error handler
export async function handleDatabaseError(err: any, context: string): Promise<ApiError> {
  console.error(`[db] ${context}:`, err)

  if (err.code === '23505') {
    // Unique constraint violation
    return {
      code: 'DUPLICATE',
      message: 'Duplicate entry',
      status: 409,
    }
  }

  if (err.code === '23503') {
    // Foreign key violation
    return {
      code: 'INVALID_REFERENCE',
      message: 'Invalid reference to related record',
      status: 409,
    }
  }

  return ApiErrors.INTERNAL_ERROR
}

// Rate limiting helper (memory-based, use Redis in production)
const requestCounts: Map<string, number[]> = new Map()

export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowSeconds: number = 60
): boolean {
  const now = Date.now()
  const window = windowSeconds * 1000

  let timestamps = requestCounts.get(key) || []
  timestamps = timestamps.filter((t) => now - t < window)

  if (timestamps.length >= maxRequests) {
    return false
  }

  timestamps.push(now)
  requestCounts.set(key, timestamps)
  return true
}
