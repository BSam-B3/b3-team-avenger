// Mobile Voice API integration tests
import { apiCall, expectSuccess, expectError } from '../setup'

const MOBILE_API_KEY = process.env.MOBILE_API_KEY || 'test-key'

describe('Mobile Voice API', () => {
  describe('POST /api/mobile/voice', () => {
    it('processes valid voice command', async () => {
      const response = await apiCall(
        '/api/mobile/voice',
        'POST',
        {
          transcript: 'create a ticket for issue number 123',
          userId: 'user-001',
          apiKey: MOBILE_API_KEY,
        }
      )

      expectSuccess(response)
      expect(response.data.data.intent).toBeDefined()
      expect(response.data.data.commandId).toBeDefined()
    })

    it('detects intent correctly', async () => {
      const testCases = [
        {
          transcript: 'create a new ticket',
          expectedIntent: 'create-ticket',
        },
        {
          transcript: 'generate quotation for customer ABC',
          expectedIntent: 'create-quotation',
        },
        {
          transcript: 'check my email',
          expectedIntent: 'check-email',
        },
        {
          transcript: 'fetch my morning brief',
          expectedIntent: 'fetch-brief',
        },
      ]

      for (const tc of testCases) {
        const response = await apiCall('/api/mobile/voice', 'POST', {
          transcript: tc.transcript,
          userId: 'user-001',
          apiKey: MOBILE_API_KEY,
        })

        expectSuccess(response)
        expect(response.data.data.intent).toContain(tc.expectedIntent)
      }
    })

    it('rejects invalid API key', async () => {
      const response = await apiCall('/api/mobile/voice', 'POST', {
        transcript: 'create ticket',
        userId: 'user-001',
        apiKey: 'invalid-key',
      })

      expectError(response, 401)
    })

    it('rejects missing transcript', async () => {
      const response = await apiCall('/api/mobile/voice', 'POST', {
        userId: 'user-001',
        apiKey: MOBILE_API_KEY,
      })

      expectError(response, 400)
    })
  })

  describe('POST /api/mobile/confirm', () => {
    let commandId: string

    beforeEach(async () => {
      const response = await apiCall('/api/mobile/voice', 'POST', {
        transcript: 'create a ticket',
        userId: 'user-001',
        apiKey: MOBILE_API_KEY,
      })
      commandId = response.data.data.commandId
    })

    it('confirms voice command execution', async () => {
      const response = await apiCall('/api/mobile/confirm', 'POST', {
        commandId,
        confirmed: true,
        apiKey: MOBILE_API_KEY,
      })

      expectSuccess(response)
      expect(response.data.data.status).toBe('confirmed')
    })

    it('cancels voice command', async () => {
      const response = await apiCall('/api/mobile/confirm', 'POST', {
        commandId,
        confirmed: false,
        apiKey: MOBILE_API_KEY,
      })

      expectSuccess(response)
      expect(response.data.data.status).toBe('cancelled')
    })

    it('rejects non-existent command', async () => {
      const response = await apiCall('/api/mobile/confirm', 'POST', {
        commandId: 'invalid-id',
        confirmed: true,
        apiKey: MOBILE_API_KEY,
      })

      expectError(response, 404)
    })
  })

  describe('Rate limiting', () => {
    it('enforces rate limit on voice endpoint', async () => {
      const userId = 'rate-test-user'
      const requests = Array(15).fill(null)

      const responses = await Promise.all(
        requests.map(() =>
          apiCall('/api/mobile/voice', 'POST', {
            transcript: 'test',
            userId,
            apiKey: MOBILE_API_KEY,
          })
        )
      )

      const rateLimitedResponses = responses.filter((r) => r.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })
})
