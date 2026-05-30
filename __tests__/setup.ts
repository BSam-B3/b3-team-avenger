// Test setup utilities
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials for testing')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Helper to make API calls in tests
export async function apiCall(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: Record<string, unknown>,
  headers?: Record<string, string>
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json() as Record<string, unknown>
  return { status: response.status, data }
}

// Database cleanup helpers
export async function cleanupTestData() {
  // Delete test records
  await supabase.from('voice_commands').delete().match({ test_flag: true })
  await supabase.from('quotation_drafts').delete().match({ test_flag: true })
  await supabase.from('onsite_checklists').delete().match({ test_flag: true })
}

export async function seedTestCustomer() {
  const { data } = await supabase
    .from('customers')
    .insert({
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '081-234-5678',
    })
    .select()
    .single()

  return data
}

export async function seedTestTemplate() {
  const { data } = await supabase
    .from('quotation_templates')
    .select()
    .eq('name', 'Hardware Refresh')
    .single()

  if (data) return data

  const { data: newTemplate } = await supabase
    .from('quotation_templates')
    .insert({
      name: 'Test Template',
      solution_type: 'test',
      base_cost: 10000,
    })
    .select()
    .single()

  return newTemplate
}

// Assertion helpers
export function expectSuccess(response: any) {
  if (response.status >= 400) {
    throw new Error(`Expected success, got ${response.status}: ${JSON.stringify(response.data)}`)
  }
}

export function expectError(response: any, expectedStatus: number) {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`)
  }
}
