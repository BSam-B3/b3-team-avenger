#!/usr/bin/env node

/**
 * 🧪 12-Function Smoke Test
 * Verify all TIER functions + critical infrastructure (Telegram, Supabase)
 *
 * Run: node scripts/smoke-test.js
 */

const https = require('https')
const http = require('http')
require('dotenv').config({ path: '.env.local' })

const BASE_URL = process.env.VERCEL_URL || 'http://localhost:3000'
const RESULTS = []

console.log(`\n🧪 SMOKE TEST: B3-Team-Avenger (${new Date().toISOString()})\n`)
console.log(`Target: ${BASE_URL}\n`)

// Test configuration
const TESTS = [
  // TIER 1: Morning Brief
  { name: 'TIER 1: Morning Brief', endpoint: '/api/workers/morning-brief', method: 'GET' },

  // TIER 2: Email Secretary
  { name: 'TIER 2: Email Secretary', endpoint: '/api/workers/email-secretary', method: 'GET' },

  // TIER 3: PDF Reports
  { name: 'TIER 3: PDF Reports', endpoint: '/api/pdf/generate-report', method: 'POST', body: { draftId: 'test' } },

  // TIER 4: Mobile Voice
  { name: 'TIER 4: Mobile Voice', endpoint: '/api/mobile/voice', method: 'POST', body: { transcript: 'test', userId: 'test', apiKey: process.env.MOBILE_API_KEY } },

  // TIER 5: Quotation System
  { name: 'TIER 5: Quotation Portal', endpoint: '/api/tier5/customer-portal?customerId=test', method: 'GET' },
  { name: 'TIER 5: Admin Templates', endpoint: '/api/tier5/admin/templates?action=templates', method: 'GET', auth: process.env.ADMIN_API_KEY },
  { name: 'TIER 5: Advanced Voice', endpoint: '/api/tier5/advanced-voice', method: 'POST', body: { transcript: 'test', userId: 'test' } },

  // Infrastructure
  { name: 'Health Check', endpoint: '/api/health', method: 'GET' },
  { name: 'Health Check (Detailed)', endpoint: '/api/health?detailed=true', method: 'GET' },

  // Workers
  { name: 'Midnight Hunter', endpoint: '/api/workers/midnight-hunter', method: 'GET' },
  { name: 'Weekly Condense', endpoint: '/api/workers/weekly-condense', method: 'GET' },
  { name: 'Quota Monitor', endpoint: '/api/monitoring/quota-check', method: 'GET' },
]

/**
 * Make HTTP request
 */
function makeRequest(url, method = 'GET', body = null, authKey = null) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const isHttps = url.startsWith('https')
    const client = isHttps ? https : http

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (authKey) {
      options.headers['Authorization'] = `Bearer ${authKey}`
    }

    const req = client.request(url, options, (res) => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        const responseTime = Date.now() - startTime
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          responseTime,
          data: data.substring(0, 100), // First 100 chars
        })
      })
    })

    req.on('error', (err) => {
      const responseTime = Date.now() - startTime
      resolve({
        status: 0,
        ok: false,
        error: err.message,
        responseTime,
      })
    })

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

/**
 * Test infrastructure dependencies
 */
async function testDependencies() {
  console.log('🔗 [INFRASTRUCTURE CHECKS]\n')

  // Test Telegram
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN
  const telegramChat = process.env.TELEGRAM_CHAT_ID
  console.log(`Telegram Bot Token: ${telegramToken ? '✅ Configured' : '❌ Missing'}`)
  console.log(`Telegram Chat ID: ${telegramChat ? '✅ Configured' : '❌ Missing'}\n`)

  // Test Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  console.log(`Supabase URL: ${supabaseUrl ? '✅ Configured' : '❌ Missing'}`)
  console.log(`Supabase Key: ${supabaseKey ? '✅ Configured' : '❌ Missing'}\n`)

  // Test API Keys
  const adminKey = process.env.ADMIN_API_KEY
  const mobileKey = process.env.MOBILE_API_KEY
  console.log(`Admin API Key: ${adminKey ? '✅ Configured' : '❌ Missing'}`)
  console.log(`Mobile API Key: ${mobileKey ? '✅ Configured' : '❌ Missing'}\n`)

  return {
    telegram: !!(telegramToken && telegramChat),
    supabase: !!(supabaseUrl && supabaseKey),
    apiKeys: !!(adminKey && mobileKey),
  }
}

/**
 * Run all smoke tests
 */
async function runTests() {
  console.log('🚀 [STARTING 12-FUNCTION TESTS]\n')

  for (const test of TESTS) {
    const url = `${BASE_URL}${test.endpoint}`
    const result = await makeRequest(url, test.method, test.body, test.auth)

    const status = result.ok ? '✅' : '❌'
    const timing = result.responseTime > 1000 ? `⚠️ ${result.responseTime}ms` : `${result.responseTime}ms`

    RESULTS.push({
      name: test.name,
      endpoint: test.endpoint,
      status: result.status,
      ok: result.ok,
      responseTime: result.responseTime,
    })

    console.log(`${status} ${test.name}`)
    console.log(`   Status: ${result.status} | Time: ${timing}`)
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
    console.log()
  }
}

/**
 * Summary report
 */
function generateReport(deps) {
  console.log('\n📊 [SMOKE TEST SUMMARY]\n')

  const passed = RESULTS.filter(r => r.ok).length
  const failed = RESULTS.filter(r => !r.ok).length
  const avgResponseTime = Math.round(RESULTS.reduce((sum, r) => sum + r.responseTime, 0) / RESULTS.length)
  const slowEndpoints = RESULTS.filter(r => r.responseTime > 1000)

  console.log(`Total Tests: ${RESULTS.length}`)
  console.log(`Passed: ${passed} ✅`)
  console.log(`Failed: ${failed} ❌`)
  console.log(`Avg Response Time: ${avgResponseTime}ms\n`)

  console.log('Infrastructure:')
  console.log(`  Telegram: ${deps.telegram ? '✅ Ready' : '❌ Not configured'}`)
  console.log(`  Supabase: ${deps.supabase ? '✅ Ready' : '❌ Not configured'}`)
  console.log(`  API Keys: ${deps.apiKeys ? '✅ Ready' : '❌ Not configured'}\n`)

  if (slowEndpoints.length > 0) {
    console.log('⚠️ Slow Endpoints (>1000ms):')
    slowEndpoints.forEach(r => {
      console.log(`  ${r.name}: ${r.responseTime}ms`)
    })
    console.log()
  }

  console.log(`Status: ${failed === 0 ? '✅ ALL SYSTEMS GO' : '⚠️ ISSUES DETECTED'}\n`)

  return {
    timestamp: new Date().toISOString(),
    passed,
    failed,
    avgResponseTime,
    slowCount: slowEndpoints.length,
    infrastructure: deps,
    details: RESULTS,
  }
}

/**
 * Main
 */
(async () => {
  try {
    const deps = await testDependencies()
    await runTests()
    const report = generateReport(deps)

    // Save report for daily tracking
    const fs = require('fs')
    const reportFile = `logs/smoke-test-${new Date().toISOString().split('T')[0]}.json`
    fs.mkdirSync('logs', { recursive: true })
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2))
    console.log(`📝 Report saved: ${reportFile}\n`)

  } catch (err) {
    console.error('❌ Smoke test error:', err.message)
    process.exit(1)
  }
})()
