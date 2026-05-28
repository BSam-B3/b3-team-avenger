/**
 * PDF Generation Utility
 * Uses pdf-lib for lightweight PDF creation
 */

import { PDFDocument, PDFPage, rgb, degrees } from 'pdf-lib'

interface TicketData {
  id: string
  title: string
  description?: string
  category?: string
  priority?: string
  createdAt: string
}

interface CustomerData {
  name: string
  email: string
  phone?: string
  company?: string
}

/**
 * Generate ticket resolution PDF
 */
export async function generateTicketPDF(
  ticket: TicketData,
  customer: CustomerData
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792]) // Letter size
  const { width, height } = page.getSize()

  // Header
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width: width,
    height: 100,
    color: rgb(0.49, 0.23, 0.93), // #7c3aed
  })

  page.drawText('Ticket Resolution Report', {
    x: 50,
    y: height - 50,
    size: 24,
    color: rgb(1, 1, 1),
    maxWidth: width - 100,
  })

  page.drawText('B3 Team Avenger — Support Service', {
    x: 50,
    y: height - 75,
    size: 11,
    color: rgb(1, 1, 1),
  })

  // Ticket Info Section
  let y = height - 140
  page.drawText('Ticket Information', {
    x: 50,
    y,
    size: 14,
    color: rgb(0.1, 0.1, 0.18),
  })

  y -= 30
  const fields = [
    [`Ticket ID:`, ticket.id],
    [`Title:`, ticket.title],
    [`Category:`, ticket.category || 'general'],
    [`Priority:`, ticket.priority || 'normal'],
    [`Status:`, '✓ RESOLVED'],
    [`Date:`, new Date().toLocaleDateString('th-TH')],
  ]

  for (const [label, value] of fields) {
    page.drawText(label, {
      x: 50,
      y,
      size: 11,
      color: rgb(0.49, 0.23, 0.93),
    })
    page.drawText(String(value), {
      x: 150,
      y,
      size: 11,
      color: rgb(0.2, 0.2, 0.2),
    })
    y -= 20
  }

  // Customer Info Section
  y -= 20
  page.drawText('Customer Details', {
    x: 50,
    y,
    size: 14,
    color: rgb(0.1, 0.1, 0.18),
  })

  y -= 30
  const customerFields = [
    [`Name:`, customer.name],
    [`Email:`, customer.email],
    ...(customer.company ? [[`Company:`, customer.company]] : []),
    ...(customer.phone ? [[`Phone:`, customer.phone]] : []),
  ]

  for (const [label, value] of customerFields) {
    page.drawText(label, {
      x: 50,
      y,
      size: 11,
      color: rgb(0.49, 0.23, 0.93),
    })
    page.drawText(String(value), {
      x: 150,
      y,
      size: 11,
      color: rgb(0.2, 0.2, 0.2),
    })
    y -= 20
  }

  // Footer
  page.drawText('B3 Team Avenger — Support Service', {
    x: 50,
    y: 30,
    size: 10,
    color: rgb(0.4, 0.45, 0.55),
  })

  page.drawText(`Generated on ${new Date().toLocaleString('th-TH')}`, {
    x: 50,
    y: 15,
    size: 9,
    color: rgb(0.4, 0.45, 0.55),
  })

  const pdfBuffer = await pdfDoc.save()
  return Buffer.from(pdfBuffer)
}
