import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib'

function orange() { return rgb(0.976, 0.451, 0.086) }  // #f97316
function gray()   { return rgb(0.42, 0.42, 0.42) }
function black()  { return rgb(0.07, 0.07, 0.07) }
function lightOrange() { return rgb(1, 0.97, 0.93) }

function drawText(page: PDFPage, text: string, x: number, y: number, size: number, color = black(), font: ReturnType<PDFDocument['embedStandardFont']> extends Promise<infer F> ? never : Awaited<ReturnType<PDFDocument['embedStandardFont']>> | undefined = undefined) {
  // font parameter used via page.drawText
  void font
  page.drawText(String(text || ''), { x, y, size, color })
}

export async function generateQuotationPDF(draft: Record<string, unknown>, customer: Record<string, unknown>, template: Record<string, unknown>): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])  // A4

  const boldFont   = await doc.embedFont(StandardFonts.HelveticaBold)
  const normalFont = await doc.embedFont(StandardFonts.Helvetica)
  const { height } = page.getSize()

  let y = height - 40

  // ── Header bar ──────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 70, width: 595, height: 70, color: orange() })
  page.drawText('B3 Team Avenger', { x: 30, y: height - 35, size: 18, font: boldFont, color: rgb(1,1,1) })
  page.drawText('ใบเสนอราคา / Quotation', { x: 30, y: height - 55, size: 11, font: normalFont, color: rgb(1,1,1) })

  const dateStr = new Date().toLocaleDateString('en-GB')
  const qNum = `QT-${String(draft.id || '').slice(0,8).toUpperCase()}`
  page.drawText(dateStr, { x: 430, y: height - 35, size: 10, font: normalFont, color: rgb(1,1,1) })
  page.drawText(qNum,    { x: 430, y: height - 50, size: 10, font: normalFont, color: rgb(1,1,1) })

  y = height - 90

  // ── Customer + Details boxes ─────────────────────────────────────────────────
  // Left box
  page.drawRectangle({ x: 30, y: y - 70, width: 250, height: 70, color: rgb(0.97,0.97,0.97), borderColor: rgb(0.87,0.87,0.87), borderWidth: 1 })
  page.drawText('CUSTOMER', { x: 40, y: y - 15, size: 8, font: boldFont, color: gray() })
  page.drawText(String(customer?.name || '-'), { x: 40, y: y - 30, size: 11, font: boldFont, color: black() })
  page.drawText(String(customer?.address || ''), { x: 40, y: y - 45, size: 9, font: normalFont, color: gray() })
  page.drawText(String(customer?.phone || ''), { x: 40, y: y - 57, size: 9, font: normalFont, color: gray() })

  // Right box
  page.drawRectangle({ x: 315, y: y - 70, width: 250, height: 70, color: rgb(0.97,0.97,0.97), borderColor: rgb(0.87,0.87,0.87), borderWidth: 1 })
  page.drawText('DETAILS', { x: 325, y: y - 15, size: 8, font: boldFont, color: gray() })
  page.drawText(String(template?.name || draft.template_name || '-').substring(0, 35), { x: 325, y: y - 30, size: 11, font: boldFont, color: black() })
  page.drawText(`Type: ${String(template?.solution_type || '-')}`, { x: 325, y: y - 45, size: 9, font: normalFont, color: gray() })
  page.drawText(`Approved: ${String(draft.approver_id || '-')}`, { x: 325, y: y - 57, size: 9, font: normalFont, color: gray() })

  y = y - 90

  // ── Items table header ───────────────────────────────────────────────────────
  page.drawRectangle({ x: 30, y: y - 20, width: 535, height: 20, color: orange() })
  page.drawText('DESCRIPTION',  { x: 38, y: y - 14, size: 9, font: boldFont, color: rgb(1,1,1) })
  page.drawText('QTY',          { x: 330, y: y - 14, size: 9, font: boldFont, color: rgb(1,1,1) })
  page.drawText('UNIT PRICE',   { x: 370, y: y - 14, size: 9, font: boldFont, color: rgb(1,1,1) })
  page.drawText('TOTAL',        { x: 480, y: y - 14, size: 9, font: boldFont, color: rgb(1,1,1) })
  y -= 20

  // ── Items rows ───────────────────────────────────────────────────────────────
  const items: Record<string, unknown>[] = (draft.line_items as Record<string, unknown>[]) || []
  let grandTotal = Number(draft.total_cost || 0)

  if (items.length > 0) {
    items.forEach((item, idx) => {
      const bg = idx % 2 === 0 ? rgb(1,1,1) : rgb(0.98,0.98,0.98)
      page.drawRectangle({ x: 30, y: y - 18, width: 535, height: 18, color: bg })
      const desc = String(item.name || item.description || '-').substring(0, 45)
      const qty = Number(item.qty || 1)
      const unitPrice = Number(item.unit_price || 0)
      const rowTotal = qty * unitPrice
      page.drawText(desc, { x: 38, y: y - 12, size: 9, font: normalFont, color: black() })
      page.drawText(String(qty), { x: 340, y: y - 12, size: 9, font: normalFont, color: black() })
      page.drawText(`${unitPrice.toLocaleString()}`, { x: 370, y: y - 12, size: 9, font: normalFont, color: black() })
      page.drawText(`${rowTotal.toLocaleString()}`, { x: 480, y: y - 12, size: 9, font: normalFont, color: black() })
      y -= 18
    })
  } else {
    page.drawRectangle({ x: 30, y: y - 18, width: 535, height: 18, color: rgb(1,1,1) })
    page.drawText(String(template?.name || 'IT Service'), { x: 38, y: y - 12, size: 9, font: normalFont, color: black() })
    page.drawText('1', { x: 340, y: y - 12, size: 9, font: normalFont, color: black() })
    page.drawText(`${grandTotal.toLocaleString()}`, { x: 370, y: y - 12, size: 9, font: normalFont, color: black() })
    page.drawText(`${grandTotal.toLocaleString()}`, { x: 480, y: y - 12, size: 9, font: normalFont, color: black() })
    y -= 18
  }

  // ── Total row ────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 30, y: y - 22, width: 535, height: 22, color: lightOrange(), borderColor: orange(), borderWidth: 1 })
  page.drawText('TOTAL (excl. VAT)', { x: 38, y: y - 15, size: 10, font: boldFont, color: black() })
  page.drawText(`THB ${grandTotal.toLocaleString()}`, { x: 440, y: y - 15, size: 11, font: boldFont, color: orange() })
  y -= 35

  // ── Note ─────────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 30, y: y - 28, width: 535, height: 28, color: rgb(0.97,0.97,0.97), borderColor: rgb(0.87,0.87,0.87), borderWidth: 1 })
  page.drawText('Note:', { x: 40, y: y - 12, size: 9, font: boldFont, color: gray() })
  page.drawText('Prices exclude 7% VAT  |  Valid for 30 days', { x: 75, y: y - 12, size: 9, font: normalFont, color: gray() })
  y -= 50

  // ── Signatures ───────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: 60, y: y - 40 }, end: { x: 220, y: y - 40 }, thickness: 1, color: gray() })
  page.drawText('Authorized Signature', { x: 80, y: y - 52, size: 9, font: normalFont, color: gray() })
  page.drawText(String(draft.approver_id || 'Authorized'), { x: 95, y: y - 63, size: 9, font: boldFont, color: black() })

  page.drawLine({ start: { x: 370, y: y - 40 }, end: { x: 530, y: y - 40 }, thickness: 1, color: gray() })
  page.drawText('Customer Acceptance', { x: 385, y: y - 52, size: 9, font: normalFont, color: gray() })
  page.drawText(String(customer?.name || 'Customer'), { x: 390, y: y - 63, size: 9, font: boldFont, color: black() })

  // ── Footer ───────────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: 30, y: 30 }, end: { x: 565, y: 30 }, thickness: 1, color: orange() })
  page.drawText('B3 Team Avenger  |  Generated automatically', { x: 30, y: 18, size: 8, font: normalFont, color: gray() })
  page.drawText(dateStr, { x: 480, y: 18, size: 8, font: normalFont, color: gray() })

  const pdfBytes = await doc.save()
  return Buffer.from(pdfBytes)
}
