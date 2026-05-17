import jsPDF from 'jspdf'
import { getPerfil, getCategorias } from './storage'

// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_W = 210
const PAGE_H = 297
const MARGIN_L = 10
const MARGIN_R = 10
const MARGIN_T = 10
const MARGIN_B = 12
const HEADER_H = 32
const CONTENT_TOP = 42
const CONTENT_BOTTOM = 275
const LEFT_COL_X = 10
const LEFT_COL_W = 93
const DIVIDER_X = 105
const RIGHT_COL_X = 107
const RIGHT_COL_W = 93
const ROW_H = 5
const SECTION_TITLE_H = 8

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function fmtAmount(num) {
  return Number(num || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function truncateText(doc, text, maxWidth) {
  if (!text) return ''
  let t = String(text)
  if (doc.getTextWidth(t) <= maxWidth) return t
  while (t.length > 1 && doc.getTextWidth(t + '…') > maxWidth) {
    t = t.slice(0, -1)
  }
  return t + '…'
}

// ─── Header ──────────────────────────────────────────────────────────────────

function drawHeader(doc, perfil, periodoInicio, periodoFin) {
  const logoBase64 = localStorage.getItem('logoEmpresa')
  if (logoBase64) {
    try {
      // Strip the data URL prefix
      const b64 = logoBase64.replace(/^data:image\/\w+;base64,/, '')
      // Detect format
      const fmt = logoBase64.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      doc.addImage(b64, fmt, 10, 10, 18, 18)
    } catch (e) {
      // Fallback placeholder
      doc.setDrawColor(180)
      doc.rect(10, 10, 18, 18)
    }
  } else {
    doc.setDrawColor(180)
    doc.setFillColor(240, 240, 240)
    doc.rect(10, 10, 18, 18, 'FD')
    doc.setFontSize(6)
    doc.setFont('times', 'italic')
    doc.setTextColor(150)
    doc.text('LOGO', 19, 20, { align: 'center' })
    doc.setTextColor(0)
  }

  // Name line
  const nameX = 32
  doc.setFont('times', 'bold')
  doc.setFontSize(11)
  doc.text('Nombre:', nameX, 16)
  const labelW = doc.getTextWidth('Nombre:')
  doc.setFont('times', 'normal')
  doc.text(`  ${perfil.nombreCompleto || ''}`, nameX + labelW, 16)

  // Period line
  doc.setFontSize(9)
  let px = nameX
  const py = 23

  const boldParts = [
    { text: 'Periodo del:', bold: true },
    { text: ` ${fmtDate(periodoInicio)}  `, bold: false },
    { text: 'al:', bold: true },
    { text: ` ${fmtDate(periodoFin)}    `, bold: false },
    { text: 'Divisa:', bold: true },
    { text: ' EURO    ', bold: false },
    { text: 'Cambio:', bold: true },
    { text: ' 1,000', bold: false },
  ]

  for (const part of boldParts) {
    doc.setFont('times', part.bold ? 'bold' : 'normal')
    doc.text(part.text, px, py)
    px += doc.getTextWidth(part.text)
  }

  // Separator line
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.line(MARGIN_L, 30, PAGE_W - MARGIN_R, 30)
}

// ─── Section drawing ─────────────────────────────────────────────────────────

/**
 * Draw a section (title + headers + rows + optional total footer).
 * Returns { nextY, overflowed, remainingRows }
 * rowExtras: optional array of strings (one per row) to render as small indented text below each row
 */
function drawSection(doc, title, headers, rows, x, y, colWidth, availableBottom, totalLabel, totalAmount, rowExtras) {
  const titleFontSize = 9
  const headerFontSize = 7.5
  const dataFontSize = 7.5
  const footerFontSize = 8
  const EXTRA_ROW_H = 4

  // Title
  if (y + SECTION_TITLE_H > availableBottom) {
    return { nextY: y, overflowed: true, remainingRows: rows }
  }

  doc.setFontSize(titleFontSize)
  doc.setFont('times', 'bold')
  doc.text(title, x, y + 5)
  // Underline title
  const titleW = doc.getTextWidth(title)
  doc.setLineWidth(0.2)
  doc.line(x, y + 5.5, x + titleW, y + 5.5)

  // Column headers
  const headerY = y + SECTION_TITLE_H - 1
  doc.setFontSize(headerFontSize)
  doc.setFont('times', 'italic')

  let hx = x
  for (const h of headers) {
    const label = h.label
    if (h.align === 'right') {
      doc.text(label, hx + h.w, headerY, { align: 'right' })
    } else if (h.align === 'center') {
      doc.text(label, hx + h.w / 2, headerY, { align: 'center' })
    } else {
      doc.text(label, hx, headerY)
    }
    hx += h.w
  }
  // Underline headers
  doc.setLineWidth(0.15)
  doc.line(x, headerY + 0.8, x + colWidth, headerY + 0.8)

  let curY = y + SECTION_TITLE_H + ROW_H - 1

  // Data rows
  for (let i = 0; i < rows.length; i++) {
    if (curY > availableBottom) {
      return { nextY: curY, overflowed: true, remainingRows: rows.slice(i) }
    }
    const row = rows[i]
    doc.setFontSize(dataFontSize)
    doc.setFont('times', 'normal')

    let rx = x
    for (let ci = 0; ci < headers.length; ci++) {
      const h = headers[ci]
      const cellVal = row[ci] !== undefined ? String(row[ci]) : ''
      const truncated = truncateText(doc, cellVal, h.w - 0.5)

      if (h.bold) {
        doc.setFont('times', 'bold')
      } else {
        doc.setFont('times', 'normal')
      }

      if (h.align === 'right') {
        doc.text(truncated, rx + h.w, curY, { align: 'right' })
      } else if (h.align === 'center') {
        doc.text(truncated, rx + h.w / 2, curY, { align: 'center' })
      } else {
        doc.text(truncated, rx, curY)
      }
      rx += h.w
    }
    curY += ROW_H

    // Row extra (e.g. comensales names)
    const extra = rowExtras?.[i]
    if (extra) {
      doc.setFontSize(6.5)
      doc.setFont('times', 'normal')
      doc.setTextColor(0.5 * 255, 0.5 * 255, 0.5 * 255)
      const extraText = truncateText(doc, `→ ${extra}`, colWidth - 5)
      doc.text(extraText, x + 5, curY)
      doc.setTextColor(0)
      curY += EXTRA_ROW_H
    }
  }

  // Footer total
  if (totalLabel !== undefined && totalAmount !== undefined) {
    if (curY + ROW_H > availableBottom) {
      return { nextY: curY, overflowed: false, remainingRows: [] }
    }
    doc.setFontSize(footerFontSize)
    const [beforeBold, boldPart] = totalLabel.split('**')
    doc.setFont('times', 'normal')
    doc.text(`Total `, x, curY)
    const tw1 = doc.getTextWidth('Total ')
    doc.setFont('times', 'bold')
    doc.text(boldPart || totalLabel, x + tw1, curY)
    const tw2 = doc.getTextWidth(boldPart || totalLabel)
    doc.setFont('times', 'bold')
    doc.text(fmtAmount(totalAmount), x + colWidth, curY, { align: 'right' })
    curY += ROW_H
  }

  return { nextY: curY + 2, overflowed: false, remainingRows: [] }
}

// ─── Liquidación block ───────────────────────────────────────────────────────

function drawLiquidacion(doc, totalGastos, x, y) {
  const labelX = x
  const valueX = x + 85
  const lineH = 5.5

  doc.setFontSize(8)

  const lines = [
    { label: 'TOTAL GASTOS', amount: totalGastos, bold: false },
    { label: 'ANTICIPOS RECIBIDOS', amount: 0, bold: false },
    { label: 'GASTOS PERSONALES', amount: 0, bold: false },
    { label: 'LIQUIDACIÓN', amount: totalGastos, bold: true },
  ]

  for (const line of lines) {
    doc.setFont('times', line.bold ? 'bold' : 'normal')
    doc.text(line.label, labelX, y)
    doc.text(fmtAmount(line.amount), valueX, y, { align: 'right' })
    y += lineH
  }

  return y
}

// ─── Firmas ──────────────────────────────────────────────────────────────────

function drawFirmas(doc, y) {
  doc.setFontSize(7.5)
  doc.setFont('times', 'normal')

  const cols = [
    { label: 'Interesado', x: 20 },
    { label: 'Superior directo', x: 85 },
    { label: 'Dirección', x: 160 },
  ]

  for (const col of cols) {
    doc.text(col.label, col.x, y, { align: 'center' })
  }

  doc.setFont('times', 'italic')
  doc.text('VºBº', 85, y + 5, { align: 'center' })
}

// ─── Footer note ─────────────────────────────────────────────────────────────

function drawFooterNote(doc) {
  doc.setFontSize(6)
  doc.setFont('times', 'italic')
  doc.setTextColor(100)
  doc.text(
    '(*) Rellenar únicamente si no se adjunta "Titre de mission"',
    PAGE_W / 2,
    PAGE_H - MARGIN_B + 4,
    { align: 'center' }
  )
  doc.setTextColor(0)
}

// ─── Vertical divider ────────────────────────────────────────────────────────

function drawDivider(doc) {
  doc.setDrawColor(0)
  doc.setLineWidth(0.2)
  doc.line(DIVIDER_X, CONTENT_TOP - 2, DIVIDER_X, CONTENT_BOTTOM)
}

// ─── Ticket images ───────────────────────────────────────────────────────────

async function drawTicketImages(doc, gastosConImagen, categorias) {
  if (gastosConImagen.length === 0) return

  const IMGS_PER_ROW = 2
  const ROWS_PER_PAGE = 2
  const IMG_MAX_W = 85
  const IMG_MAX_H = 100
  const IMG_START_X = [10, 110]
  const IMG_START_Y = [15, 125]
  const CAPTION_OFFSET = 3

  let imgIndex = 0

  while (imgIndex < gastosConImagen.length) {
    doc.addPage()
    drawFooterNote(doc)

    for (let row = 0; row < ROWS_PER_PAGE && imgIndex < gastosConImagen.length; row++) {
      for (let col = 0; col < IMGS_PER_ROW && imgIndex < gastosConImagen.length; col++) {
        const g = gastosConImagen[imgIndex]
        imgIndex++

        const baseX = IMG_START_X[col]
        const baseY = IMG_START_Y[row]

        try {
          const raw = g.imagenBlob || g.miniatura
          if (!raw) continue

          const b64 = raw.replace(/^data:image\/\w+;base64,/, '')
          const fmt = raw.startsWith('data:image/png') ? 'PNG' : 'JPEG'

          // Load image to get dimensions
          await new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
              const nw = img.naturalWidth || 1
              const nh = img.naturalHeight || 1
              const aspect = nw / nh

              let drawW = IMG_MAX_W
              let drawH = IMG_MAX_W / aspect
              if (drawH > IMG_MAX_H) {
                drawH = IMG_MAX_H
                drawW = IMG_MAX_H * aspect
              }

              const imgX = baseX + (IMG_MAX_W - drawW) / 2
              const imgY = baseY

              try {
                doc.addImage(b64, fmt, imgX, imgY, drawW, drawH)
              } catch (e) {
                // Skip broken images
              }

              // Caption
              // Find subcategoria name
              let subNombre = ''
              for (const cat of categorias) {
                const sub = cat.subcategorias.find(s => s.id === g.subcategoriaId)
                if (sub) { subNombre = sub.nombre; break }
              }
              const caption = [
                fmtDate(g.fecha),
                subNombre,
                g.comercio || '',
                g.importe ? `${fmtAmount(g.importe)} €` : '',
              ].filter(Boolean).join(' · ')

              doc.setFontSize(6.5)
              doc.setFont('times', 'normal')
              doc.text(
                truncateText(doc, caption, IMG_MAX_W),
                baseX + IMG_MAX_W / 2,
                baseY + IMG_MAX_H + CAPTION_OFFSET,
                { align: 'center' }
              )

              resolve()
            }
            img.onerror = resolve
            img.src = raw
          })
        } catch (e) {
          // skip
        }
      }
    }
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generatePDF(gastos, mes, categorias) {
  const perfil = getPerfil()

  // Period
  const [year, month] = mes.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const pad2 = n => String(n).padStart(2, '0')
  const toIso = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  const periodoInicio = toIso(firstDay)
  const periodoFin = toIso(lastDay)

  // Resolve subcategoria for each gasto
  function resolveSubcat(g) {
    if (!categorias) return null
    for (const cat of categorias) {
      const sub = cat.subcategorias?.find(s => s.id === g.subcategoriaId)
      if (sub) return sub
    }
    return null
  }

  function getSeccionPDF(g, sub) {
    // esKilometraje always routes to kilometraje section
    if (g.esKilometraje || sub?.esKilometraje) return 'kilometraje'
    return sub?.seccionPDF || 'varios'
  }

  // Classify gastos by seccionPDF
  const sections = {
    locomocion: [],
    hoteles: [],
    restaurantes: [],
    kilometraje: [],
    invitaciones: [],
    varios: [],
  }

  for (const g of gastos) {
    const sub = resolveSubcat(g)
    const seccion = getSeccionPDF(g, sub)
    if (sections[seccion]) {
      sections[seccion].push({ ...g, _sub: sub })
    } else {
      sections.varios.push({ ...g, _sub: sub })
    }
  }

  // Defensive: verify all gastos are accounted for
  const totalProcessed = Object.values(sections).reduce((s, arr) => s + arr.length, 0)
  if (totalProcessed !== gastos.length) {
    console.warn(`PDF: ${gastos.length} gastos input but only ${totalProcessed} processed. Some may be duplicated in sections.`)
  }

  // Sort each section by date
  for (const key of Object.keys(sections)) {
    sections[key].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
  }

  // Build row arrays
  const locoRows = sections.locomocion.map(g => [
    fmtDate(g.fecha),
    g.descripcion || g.motivo || '',
    (g._sub?.nombre || '').toUpperCase(),
    fmtAmount(g.importe),
  ])

  const hotelRows = sections.hoteles.map(g => [
    fmtDate(g.fecha),
    g.comercio || '',
    g.descripcion || '',
    g.numero || '',
    fmtAmount(g.importe),
  ])

  const restRows = sections.restaurantes.map(g => [
    fmtDate(g.fecha),
    String(g.comensales?.length || 1),
    fmtAmount(g.importe),
  ])
  const restExtras = sections.restaurantes.map(g =>
    g.comensales?.length > 0 ? g.comensales.filter(c => c && c.trim()).join(', ') : null
  )

  const kmRows = sections.kilometraje.map(g => [
    fmtDate(g.fecha),
    g.descripcion || g.motivo || '',
    `${g.origen || ''} → ${g.destino || ''}`,
    String(g.kilometros || ''),
  ])

  const invRows = sections.invitaciones.map(g => [
    fmtDate(g.fecha),
    String(g.comensales?.length || 1),
    fmtAmount(g.importe),
  ])
  const invExtras = sections.invitaciones.map(g =>
    g.comensales?.length > 0 ? g.comensales.filter(c => c && c.trim()).join(', ') : null
  )

  const variosRows = sections.varios.map(g => [
    fmtDate(g.fecha),
    g.comercio || g.descripcion || g._sub?.nombre || '',
    fmtAmount(g.importe),
  ])

  // Totals
  const sumSection = key =>
    sections[key].reduce((s, g) => s + (parseFloat(g.importe) || 0), 0)

  const totalLocomocion = sumSection('locomocion')
  const totalHoteles = sumSection('hoteles')
  const totalRestaurantes = sumSection('restaurantes')
  const totalInvitaciones = sumSection('invitaciones')
  const totalVarios = sumSection('varios')
  const totalGastos = totalLocomocion + totalHoteles + totalRestaurantes + totalInvitaciones + totalVarios

  // Column definitions
  const locoHeaders = [
    { label: 'Fecha', w: 18, align: 'left' },
    { label: 'Motivo', w: 35, align: 'left' },
    { label: 'Medio', w: 22, align: 'left', bold: true },
    { label: 'Importe', w: 18, align: 'right' },
  ]

  const hotelHeaders = [
    { label: 'Fecha', w: 18, align: 'left' },
    { label: 'Ciudad', w: 25, align: 'left' },
    { label: 'Concepto', w: 28, align: 'left' },
    { label: 'Nº', w: 8, align: 'left' },
    { label: 'Importe', w: 14, align: 'right' },
  ]

  const restHeaders = [
    { label: 'Fecha', w: 18, align: 'left' },
    { label: 'Personas', w: 15, align: 'center' },
    { label: 'Importe', w: 60, align: 'right' },
  ]

  const kmHeaders = [
    { label: 'Fecha', w: 18, align: 'left' },
    { label: 'Motivo(*)', w: 30, align: 'left' },
    { label: 'Trayecto', w: 28, align: 'left' },
    { label: 'Kilómetros', w: 17, align: 'right' },
  ]

  const invHeaders = [
    { label: 'Fecha', w: 18, align: 'left' },
    { label: 'Personas', w: 15, align: 'center' },
    { label: 'Importe', w: 60, align: 'right' },
  ]

  const variosHeaders = [
    { label: 'Fecha', w: 18, align: 'left' },
    { label: 'Concepto', w: 55, align: 'left' },
    { label: 'Importe', w: 20, align: 'right' },
  ]

  // ─── PDF document ───────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setFont('times', 'normal')

  // Page 1
  drawHeader(doc, perfil, periodoInicio, periodoFin)
  drawDivider(doc)
  drawFooterNote(doc)

  // ─── Left column sections ───────────────────────────────────────────────────
  let leftY = CONTENT_TOP

  // Helper: ensure we have space for at least the title+headers
  function ensureLeftPage() {
    if (leftY + SECTION_TITLE_H + ROW_H > CONTENT_BOTTOM) {
      doc.addPage()
      drawHeader(doc, perfil, periodoInicio, periodoFin)
      drawDivider(doc)
      drawFooterNote(doc)
      leftY = CONTENT_TOP
    }
  }

  // MEDIOS DE LOCOMOCIÓN
  ensureLeftPage()
  {
    let remaining = locoRows
    let first = true
    while (remaining.length > 0 || first) {
      first = false
      const result = drawSection(
        doc,
        'MEDIOS DE LOCOMOCIÓN',
        locoHeaders,
        remaining,
        LEFT_COL_X, leftY, LEFT_COL_W, CONTENT_BOTTOM,
        '**Desplazamientos:', totalLocomocion
      )
      leftY = result.nextY
      remaining = result.remainingRows
      if (result.overflowed && remaining.length > 0) {
        doc.addPage()
        drawHeader(doc, perfil, periodoInicio, periodoFin)
        drawDivider(doc)
        drawFooterNote(doc)
        leftY = CONTENT_TOP
      } else {
        break
      }
    }
  }

  // HOTELES
  ensureLeftPage()
  {
    let remaining = hotelRows
    let first = true
    while (remaining.length > 0 || first) {
      first = false
      const result = drawSection(
        doc,
        'HOTELES',
        hotelHeaders,
        remaining,
        LEFT_COL_X, leftY, LEFT_COL_W, CONTENT_BOTTOM,
        '**Hoteles:', totalHoteles
      )
      leftY = result.nextY
      remaining = result.remainingRows
      if (result.overflowed && remaining.length > 0) {
        doc.addPage()
        drawHeader(doc, perfil, periodoInicio, periodoFin)
        drawDivider(doc)
        drawFooterNote(doc)
        leftY = CONTENT_TOP
      } else {
        break
      }
    }
  }

  // RESTAURANTES
  ensureLeftPage()
  {
    let remaining = restRows
    let remainingExtras = restExtras
    let first = true
    while (remaining.length > 0 || first) {
      first = false
      const result = drawSection(
        doc,
        'RESTAURANTES',
        restHeaders,
        remaining,
        LEFT_COL_X, leftY, LEFT_COL_W, CONTENT_BOTTOM,
        '**Restaurantes:', totalRestaurantes,
        remainingExtras
      )
      leftY = result.nextY
      const consumed = remaining.length - result.remainingRows.length
      remainingExtras = remainingExtras.slice(consumed)
      remaining = result.remainingRows
      if (result.overflowed && remaining.length > 0) {
        doc.addPage()
        drawHeader(doc, perfil, periodoInicio, periodoFin)
        drawDivider(doc)
        drawFooterNote(doc)
        leftY = CONTENT_TOP
      } else {
        break
      }
    }
  }

  // Track last left-column page
  const lastLeftPage = doc.internal.getCurrentPageInfo().pageNumber

  // ─── Right column sections ──────────────────────────────────────────────────
  // Go back to page 1 for the right column
  doc.setPage(1)
  let rightY = CONTENT_TOP
  let rightPage = 1

  function ensureRightPage() {
    if (rightY + SECTION_TITLE_H + ROW_H > CONTENT_BOTTOM) {
      rightPage++
      if (rightPage <= doc.internal.getNumberOfPages()) {
        doc.setPage(rightPage)
      } else {
        doc.addPage()
        drawHeader(doc, perfil, periodoInicio, periodoFin)
        drawDivider(doc)
        drawFooterNote(doc)
      }
      rightY = CONTENT_TOP
    }
  }

  // COMPENSACIONES KILOMÉTRICAS
  ensureRightPage()
  {
    let remaining = kmRows
    let first = true
    while (remaining.length > 0 || first) {
      first = false
      const result = drawSection(
        doc,
        'COMPENSACIONES KILOMÉTRICAS',
        kmHeaders,
        remaining,
        RIGHT_COL_X, rightY, RIGHT_COL_W, CONTENT_BOTTOM,
        undefined, undefined  // no total footer for km
      )
      rightY = result.nextY
      remaining = result.remainingRows
      if (result.overflowed && remaining.length > 0) {
        rightPage++
        if (rightPage <= doc.internal.getNumberOfPages()) {
          doc.setPage(rightPage)
        } else {
          doc.addPage()
          drawHeader(doc, perfil, periodoInicio, periodoFin)
          drawDivider(doc)
          drawFooterNote(doc)
        }
        rightY = CONTENT_TOP
      } else {
        break
      }
    }
  }

  // INVITACIONES
  ensureRightPage()
  {
    let remaining = invRows
    let remainingExtras = invExtras
    let first = true
    while (remaining.length > 0 || first) {
      first = false
      const result = drawSection(
        doc,
        'INVITACIONES',
        invHeaders,
        remaining,
        RIGHT_COL_X, rightY, RIGHT_COL_W, CONTENT_BOTTOM,
        '**Invitaciones:', totalInvitaciones,
        remainingExtras
      )
      rightY = result.nextY
      const consumed = remaining.length - result.remainingRows.length
      remainingExtras = remainingExtras.slice(consumed)
      remaining = result.remainingRows
      if (result.overflowed && remaining.length > 0) {
        rightPage++
        if (rightPage <= doc.internal.getNumberOfPages()) {
          doc.setPage(rightPage)
        } else {
          doc.addPage()
          drawHeader(doc, perfil, periodoInicio, periodoFin)
          drawDivider(doc)
          drawFooterNote(doc)
        }
        rightY = CONTENT_TOP
      } else {
        break
      }
    }
  }

  // VARIOS
  ensureRightPage()
  {
    let remaining = variosRows
    let first = true
    while (remaining.length > 0 || first) {
      first = false
      const result = drawSection(
        doc,
        'VARIOS',
        variosHeaders,
        remaining,
        RIGHT_COL_X, rightY, RIGHT_COL_W, CONTENT_BOTTOM,
        '**Varios:', totalVarios
      )
      rightY = result.nextY
      remaining = result.remainingRows
      if (result.overflowed && remaining.length > 0) {
        rightPage++
        if (rightPage <= doc.internal.getNumberOfPages()) {
          doc.setPage(rightPage)
        } else {
          doc.addPage()
          drawHeader(doc, perfil, periodoInicio, periodoFin)
          drawDivider(doc)
          drawFooterNote(doc)
        }
        rightY = CONTENT_TOP
      } else {
        break
      }
    }
  }

  // ─── Liquidación + Firmas ───────────────────────────────────────────────────
  // Ensure we're on the last page (max of left and right)
  const totalPages = doc.internal.getNumberOfPages()
  const lastPage = Math.max(lastLeftPage, rightPage, totalPages)
  doc.setPage(lastPage)

  // Make sure there's room; if not, add a page
  const liqH = 4 * 5.5 + 10 + 15  // 4 lines + spacing + firmas
  if (rightY + liqH > CONTENT_BOTTOM) {
    doc.addPage()
    drawHeader(doc, perfil, periodoInicio, periodoFin)
    drawFooterNote(doc)
    rightY = CONTENT_TOP
  }

  const liqEndY = drawLiquidacion(doc, totalGastos, RIGHT_COL_X, rightY + 4)
  drawFirmas(doc, liqEndY + 12)

  // ─── Ticket images ──────────────────────────────────────────────────────────
  const gastosConImagen = gastos.filter(g => {
    const sub = resolveSubcat(g)
    return !g.esKilometraje && sub?.seccionPDF !== 'kilometraje' && (g.imagenBlob || g.miniatura)
  })

  await drawTicketImages(doc, gastosConImagen, categorias)

  return doc
}
