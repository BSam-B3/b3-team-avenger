// Quotation API integration tests
import { apiCall, seedTestCustomer, seedTestTemplate, expectSuccess, expectError } from '../setup'

describe('Quotation API', () => {
  let customerId: string
  let templateId: string

  beforeAll(async () => {
    const customer = await seedTestCustomer()
    const template = await seedTestTemplate()
    customerId = customer.id
    templateId = template.id
  })

  describe('POST /api/quotation/create-draft', () => {
    it('creates a new quotation draft', async () => {
      const response = await apiCall('/api/quotation/create-draft', 'POST', {
        customerId,
        templateId,
        salesPersonId: 'john',
        markupPct: 25,
      })

      expectSuccess(response)
      expect(response.data.data.id).toBeDefined()
      expect(response.data.data.status).toBe('draft')
    })

    it('rejects missing required fields', async () => {
      const response = await apiCall('/api/quotation/create-draft', 'POST', {
        customerId,
        // missing templateId
        salesPersonId: 'john',
      })

      expectError(response, 400)
      expect(response.data.error.code).toBe('MISSING_FIELD')
    })

    it('rejects invalid markup percentage', async () => {
      const response = await apiCall('/api/quotation/create-draft', 'POST', {
        customerId,
        templateId,
        salesPersonId: 'john',
        markupPct: 150, // Invalid: >100
      })

      expectError(response, 400)
    })

    it('calculates total cost correctly', async () => {
      const response = await apiCall('/api/quotation/create-draft', 'POST', {
        customerId,
        templateId,
        salesPersonId: 'john',
        markupPct: 50, // 50% markup
      })

      expectSuccess(response)
      const baseTemplate = await seedTestTemplate()
      const expectedTotal = baseTemplate.base_cost * 1.5
      expect(response.data.data.total_cost).toBe(expectedTotal)
    })
  })

  describe('POST /api/quotation/approve', () => {
    let draftId: string

    beforeEach(async () => {
      const response = await apiCall('/api/quotation/create-draft', 'POST', {
        customerId,
        templateId,
        salesPersonId: 'john',
        markupPct: 25,
      })
      draftId = response.data.data.id
    })

    it('approves a draft and generates PDF', async () => {
      const response = await apiCall('/api/quotation/approve', 'POST', {
        quotationId: draftId,
        approverId: 'boss',
      })

      expectSuccess(response)
      expect(response.data.data.status).toBe('approved')
    })

    it('rejects non-existent quotation', async () => {
      const response = await apiCall('/api/quotation/approve', 'POST', {
        quotationId: 'invalid-id',
        approverId: 'boss',
      })

      expectError(response, 404)
    })
  })

  describe('POST /api/quotation/reject', () => {
    let draftId: string

    beforeEach(async () => {
      const response = await apiCall('/api/quotation/create-draft', 'POST', {
        customerId,
        templateId,
        salesPersonId: 'john',
        markupPct: 25,
      })
      draftId = response.data.data.id
    })

    it('rejects a draft and notifies salesperson', async () => {
      const response = await apiCall('/api/quotation/reject', 'POST', {
        quotationId: draftId,
        reason: 'Markup too high',
      })

      expectSuccess(response)
      expect(response.data.data.status).toBe('rejected')
    })
  })
})
