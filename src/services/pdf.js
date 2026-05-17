import jsPDF from 'jspdf'
import { getPerfil } from './storage'

// ─── Page layout constants ────────────────────────────────────────────────────
const PW = 210, PH = 297          // A4
const ML = 9, MR = 9              // left/right margins (unused directly but kept for reference)
const LOGO_X = 10, LOGO_Y = 8, LOGO_W = 20, LOGO_H = 20
const HDR_LINE_Y = 27             // horizontal line under header
const BOX_X = 9, BOX_Y = 27      // content box top-left
const BOX_W = 192, BOX_H = 240   // content box: (9,27) to (201,267)
const BOX_BOTTOM = BOX_Y + BOX_H // = 267
const CDIV_X = 105                // center vertical divider x
const LEFT_X = BOX_X + 1         // left col content starts: x=10
const LEFT_W = CDIV_X - LEFT_X - 1  // ~94mm
const RIGHT_X = CDIV_X + 2       // right col content starts: x=107
const RIGHT_W = BOX_X + BOX_W - RIGHT_X - 1  // ~93mm

// Fixed horizontal separators INSIDE left column
const LEFT_SEP1 = 157             // line between LOCOMOCION and HOTELES
const LEFT_SEP2 = 194             // line between HOTELES and RESTAURANTES

// Fixed horizontal separator in right column
const RIGHT_SEP = 178             // line between COMPENSACIONES and INVITACIONES/VARIOS

// Sub-divider inside lower-right area (INVITACIONES | VARIOS)
const RSUB_DIV_X = 154            // vertical line separating INVITACIONES (left) from VARIOS (right)
const RINV_W = RSUB_DIV_X - RIGHT_X - 1   // INVITACIONES width
const RVAR_X = RSUB_DIV_X + 1
const RVAR_W = BOX_X + BOX_W - RVAR_X - 1

// Liquidación block
const LIQ_Y = 228                 // where TOTAL GASTOS starts
const LIQ_LINE1_Y = LIQ_Y - 1    // horizontal line above TOTAL GASTOS
const LIQ_LINE2_Y = 242           // horizontal line above LIQUIDACIÓN
const LIQ_LABEL_Y = 247           // LIQUIDACIÓN label y

// Signature area
const SIG_Y = 251                 // "VºBº" y
const SIG_LABELS_Y = 255          // "Interesado | Superior directo | Dirección" y
const SIG_LINE_Y = 264            // signature underlines y

const ROW_H = 5                   // standard row height mm
const TITLE_H = 6                 // section title height
const HDR_H = 5                   // column headers height

// Data row start positions
const locomocion_data_y   = BOX_Y + TITLE_H + HDR_H + ROW_H + 1
const hoteles_data_y      = LEFT_SEP1 + TITLE_H + HDR_H + ROW_H + 1
const restaurantes_data_y = LEFT_SEP2 + TITLE_H + HDR_H + ROW_H + 1
const compkm_data_y       = BOX_Y + TITLE_H + HDR_H + ROW_H + 1
const inv_data_y          = RIGHT_SEP + TITLE_H + HDR_H + ROW_H + 1
const varios_data_y       = RIGHT_SEP + TITLE_H + HDR_H + ROW_H + 1

// Data area limits
const locomocion_max_y    = LEFT_SEP1 - ROW_H - 2
const hoteles_max_y       = LEFT_SEP2 - ROW_H - 2
const restaurantes_max_y  = BOX_BOTTOM - ROW_H - 4
const compkm_max_y        = RIGHT_SEP - 2
const inv_max_y           = LIQ_LINE1_Y - ROW_H - 2
const varios_max_y        = LIQ_LINE1_Y - ROW_H - 2

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

function getSubNombre(g, categorias) {
  if (!categorias) return ''
  for (const cat of categorias) {
    const sub = cat.subcategorias?.find(s => s.id === g.subcategoriaId)
    if (sub) return sub.nombre
  }
  return g.subcategoriaId || ''
}

function getSeccionPDF(g, categorias) {
  if (g.esKilometraje) return 'kilometraje'
  if (!categorias) return 'varios'
  for (const cat of categorias) {
    const sub = cat.subcategorias?.find(s => s.id === g.subcategoriaId)
    if (sub) return sub.seccionPDF || 'varios'
  }
  return 'varios'
}

// ─── Header ──────────────────────────────────────────────────────────────────

function drawHeader(doc, perfil, periodoInicio, periodoFin) {
  const logoBase64 = localStorage.getItem('logoEmpresa')
  if (logoBase64) {
    try {
      const b64 = logoBase64.replace(/^data:image\/\w+;base64,/, '')
      const fmt = logoBase64.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      doc.addImage(b64, fmt, LOGO_X, LOGO_Y, LOGO_W, LOGO_H)
    } catch (e) {
      doc.setDrawColor(180)
      doc.rect(LOGO_X, LOGO_Y, LOGO_W, LOGO_H)
    }
  } else {
    doc.setDrawColor(180)
    doc.setFillColor(240, 240, 240)
    doc.rect(LOGO_X, LOGO_Y, LOGO_W, LOGO_H, 'FD')
    doc.setFontSize(6)
    doc.setFont('times', 'italic')
    doc.setTextColor(150)
    doc.text('LOGO', LOGO_X + LOGO_W / 2, LOGO_Y + LOGO_H / 2, { align: 'center' })
    doc.setTextColor(0)
  }

  // Name line at y=15
  const nameX = 33
  doc.setFontSize(9)
  doc.setFont('times', 'bold')
  doc.text('Nombre:', nameX, 15)
  const labelW = doc.getTextWidth('Nombre:')
  doc.setFont('times', 'normal')
  doc.text(`  ${perfil.nombreCompleto || ''}`, nameX + labelW, 15)

  // Period line at y=22
  let px = nameX
  const py = 22
  doc.setFontSize(8)

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

  // Separator line at HDR_LINE_Y
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.line(BOX_X, HDR_LINE_Y, BOX_X + BOX_W, HDR_LINE_Y)
}

// ─── Page Frame ──────────────────────────────────────────────────────────────

function drawPageFrame(doc) {
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)

  // Outer border
  doc.rect(BOX_X, BOX_Y, BOX_W, BOX_H)

  // Center vertical divider
  doc.line(CDIV_X, BOX_Y, CDIV_X, BOX_BOTTOM)

  // Left column separators
  doc.setLineWidth(0.2)
  doc.line(BOX_X, LEFT_SEP1, CDIV_X, LEFT_SEP1)
  doc.line(BOX_X, LEFT_SEP2, CDIV_X, LEFT_SEP2)

  // Right column separator
  doc.line(CDIV_X, RIGHT_SEP, BOX_X + BOX_W, RIGHT_SEP)

  // Sub-divider in lower right
  doc.line(RSUB_DIV_X, RIGHT_SEP, RSUB_DIV_X, LIQ_LINE1_Y)

  // Liquidación separator lines
  doc.line(CDIV_X, LIQ_LINE1_Y, BOX_X + BOX_W, LIQ_LINE1_Y)
  doc.line(CDIV_X, LIQ_LINE2_Y, BOX_X + BOX_W, LIQ_LINE2_Y)

  // Signature underlines
  doc.setLineWidth(0.2)
  doc.line(LEFT_X, SIG_LINE_Y, CDIV_X - 2, SIG_LINE_Y)
  doc.line(CDIV_X + 2, SIG_LINE_Y, RSUB_DIV_X - 2, SIG_LINE_Y)
  doc.line(RSUB_DIV_X + 2, SIG_LINE_Y, BOX_X + BOX_W - 1, SIG_LINE_Y)
}

// ─── Section Titles ───────────────────────────────────────────────────────────

function drawSectionTitles(doc) {
  doc.setFont('times', 'bold')
  doc.setFontSize(8)

  // Helper: draw centered bold underlined title
  function centeredTitle(text, colLeftX, colRightX, y) {
    const midX = (colLeftX + colRightX) / 2
    doc.text(text, midX, y, { align: 'center' })
    const tw = doc.getTextWidth(text)
    doc.setLineWidth(0.15)
    doc.line(midX - tw / 2, y + 0.7, midX + tw / 2, y + 0.7)
  }

  // Left column titles
  centeredTitle('MEDIOS DE LOCOMOCIÓN', LEFT_X, CDIV_X, BOX_Y + TITLE_H / 2 + 1)
  centeredTitle('HOTELES', LEFT_X, CDIV_X, LEFT_SEP1 + TITLE_H / 2 + 1)
  centeredTitle('RESTAURANTES', LEFT_X, CDIV_X, LEFT_SEP2 + TITLE_H / 2 + 1)

  // Right column: COMPENSACIONES KILOMÉTRICAS (full right col width above RIGHT_SEP)
  centeredTitle('COMPENSACIONES KILOMÉTRICAS', RIGHT_X, BOX_X + BOX_W, BOX_Y + TITLE_H / 2 + 1)

  // Lower right sub-sections
  centeredTitle('INVITACIONES', RIGHT_X, RSUB_DIV_X, RIGHT_SEP + TITLE_H / 2 + 1)
  centeredTitle('VARIOS', RVAR_X, BOX_X + BOX_W, RIGHT_SEP + TITLE_H / 2 + 1)
}

// ─── Column Headers ───────────────────────────────────────────────────────────

function drawColumnHeaders(doc) {
  doc.setFont('times', 'bold')
  doc.setFontSize(7)

  function underlinedHeader(text, x, y, align) {
    if (align === 'right') {
      doc.text(text, x, y, { align: 'right' })
      const tw = doc.getTextWidth(text)
      doc.setLineWidth(0.1)
      doc.line(x - tw, y + 0.6, x, y + 0.6)
    } else {
      doc.text(text, x, y)
      const tw = doc.getTextWidth(text)
      doc.setLineWidth(0.1)
      doc.line(x, y + 0.6, x + tw, y + 0.6)
    }
  }

  // MEDIOS DE LOCOMOCIÓN headers
  const locHdrY = BOX_Y + TITLE_H + HDR_H
  underlinedHeader('Fecha', LEFT_X + 1, locHdrY, 'left')
  underlinedHeader('Motivo', LEFT_X + 22, locHdrY, 'left')
  underlinedHeader('Medio', LEFT_X + 54, locHdrY, 'left')
  underlinedHeader('Importe', CDIV_X - 1, locHdrY, 'right')

  // HOTELES headers
  const hotHdrY = LEFT_SEP1 + TITLE_H + HDR_H
  underlinedHeader('Fecha', LEFT_X + 1, hotHdrY, 'left')
  underlinedHeader('Ciudad', LEFT_X + 22, hotHdrY, 'left')
  underlinedHeader('Concepto', LEFT_X + 43, hotHdrY, 'left')
  underlinedHeader('Número', LEFT_X + 68, hotHdrY, 'left')
  underlinedHeader('Importe', CDIV_X - 1, hotHdrY, 'right')

  // RESTAURANTES headers
  const restHdrY = LEFT_SEP2 + TITLE_H + HDR_H
  underlinedHeader('Fecha', LEFT_X + 1, restHdrY, 'left')
  underlinedHeader('Personas', LEFT_X + 22, restHdrY, 'left')
  underlinedHeader('Importe', CDIV_X - 1, restHdrY, 'right')

  // COMPENSACIONES KILOMÉTRICAS headers
  const kmHdrY = BOX_Y + TITLE_H + HDR_H
  underlinedHeader('Fecha', RIGHT_X + 1, kmHdrY, 'left')
  underlinedHeader('Motivo(*)', RIGHT_X + 22, kmHdrY, 'left')
  underlinedHeader('Trayecto', RIGHT_X + 52, kmHdrY, 'left')
  underlinedHeader('Kilómetros', BOX_X + BOX_W - 1, kmHdrY, 'right')

  // INVITACIONES headers
  const invHdrY = RIGHT_SEP + TITLE_H + HDR_H
  underlinedHeader('Fecha', RIGHT_X + 1, invHdrY, 'left')
  underlinedHeader('Personas', RIGHT_X + 17, invHdrY, 'left')
  underlinedHeader('Importe', RSUB_DIV_X - 1, invHdrY, 'right')

  // VARIOS headers
  const varHdrY = RIGHT_SEP + TITLE_H + HDR_H
  underlinedHeader('Fecha', RVAR_X + 1, varHdrY, 'left')
  underlinedHeader('Concepto', RVAR_X + 17, varHdrY, 'left')
  underlinedHeader('Importe', BOX_X + BOX_W - 1, varHdrY, 'right')
}

// ─── Total line ───────────────────────────────────────────────────────────────

// colLeftX: left edge of column (to clamp label start within bounds)
function drawTotalLine(doc, label, amount, colRightX, y, colLeftX = LEFT_X) {
  const amountStr = fmtAmount(amount)
  // Start "Total" at most 55mm before right edge, but never outside the column
  const indentX = Math.max(colLeftX + 1, colRightX - 55)
  doc.setFontSize(7)
  doc.setFont('times', 'normal')
  doc.text('Total ', indentX, y)
  const w1 = doc.getTextWidth('Total ')
  doc.setFont('times', 'bold')
  doc.text(label + ':', indentX + w1, y)
  // Amount right-aligned at far right, bold
  doc.text(amountStr, colRightX, y, { align: 'right' })
  // Double underline under amount only
  const amtW = doc.getTextWidth(amountStr)
  doc.setLineWidth(0.2)
  doc.line(colRightX - amtW, y + 1, colRightX, y + 1)
  doc.line(colRightX - amtW, y + 1.7, colRightX, y + 1.7)
  doc.setFont('times', 'normal')
}

// ─── Liquidación ─────────────────────────────────────────────────────────────

function drawLiquidacion(doc, totalGastos) {
  doc.setFontSize(7)

  // TOTAL GASTOS
  doc.setFont('times', 'normal')
  doc.text('TOTAL GASTOS', RIGHT_X + 1, LIQ_Y)
  doc.setFont('times', 'bold')
  doc.text(fmtAmount(totalGastos), BOX_X + BOX_W - 1, LIQ_Y, { align: 'right' })

  // ANTICIPOS RECIBIDOS
  doc.setFont('times', 'normal')
  doc.text('ANTICIPOS RECIBIDOS', RIGHT_X + 1, LIQ_Y + 5)
  doc.setFont('times', 'bold')
  doc.text(fmtAmount(0), BOX_X + BOX_W - 1, LIQ_Y + 5, { align: 'right' })

  // GASTOS PERSONALES
  doc.setFont('times', 'normal')
  doc.text('GASTOS PERSONALES', RIGHT_X + 1, LIQ_Y + 10)
  doc.setFont('times', 'bold')
  doc.text(fmtAmount(0), BOX_X + BOX_W - 1, LIQ_Y + 10, { align: 'right' })

  // LIQ_LINE2_Y already drawn by frame

  // LIQUIDACIÓN
  doc.setFont('times', 'bold')
  doc.setFontSize(7.5)
  doc.text('LIQUIDACIÓN', RIGHT_X + 1, LIQ_LABEL_Y)
  doc.text(fmtAmount(totalGastos), BOX_X + BOX_W - 1, LIQ_LABEL_Y, { align: 'right' })
  doc.setFont('times', 'normal')
}

// ─── Signature Area ───────────────────────────────────────────────────────────

function drawSignatureArea(doc) {
  doc.setFontSize(7)
  doc.setFont('times', 'normal')

  // VºBº centered between CDIV_X and RSUB_DIV_X
  const vbMidX = (CDIV_X + RSUB_DIV_X) / 2
  doc.text('VºBº', vbMidX, SIG_Y, { align: 'center' })

  // Labels
  const intMidX = (LEFT_X + CDIV_X - 2) / 2
  const supMidX = (CDIV_X + 2 + RSUB_DIV_X - 2) / 2
  const dirMidX = (RSUB_DIV_X + 2 + BOX_X + BOX_W - 1) / 2

  doc.text('Interesado', intMidX, SIG_LABELS_Y, { align: 'center' })
  doc.text('Superior directo', supMidX, SIG_LABELS_Y, { align: 'center' })
  doc.text('Dirección', dirMidX, SIG_LABELS_Y, { align: 'center' })
}

// ─── Footer Note ─────────────────────────────────────────────────────────────

function drawFooterNote(doc) {
  doc.setFont('times', 'italic')
  doc.setFontSize(6)
  doc.setTextColor(0)
  doc.text(
    '(*) Rellenar únicamente si no se adjunta "Titre de mission"',
    LEFT_X,
    BOX_BOTTOM + 4
  )
}

// ─── Comensales line ─────────────────────────────────────────────────────────

function drawComensalesLine(doc, names, x, y, maxW) {
  doc.setFont('times', 'italic')
  doc.setFontSize(6)
  doc.setTextColor(100, 100, 100)
  const w = maxW || 80
  doc.text(truncateText(doc, names, w), x, y)
  doc.setTextColor(0, 0, 0)
  doc.setFont('times', 'normal')
}

// ─── Individual row drawing functions ─────────────────────────────────────────

function drawLocomocionRow(doc, g, y, categorias) {
  doc.setFont('times', 'normal')
  doc.setFontSize(7)
  doc.text(fmtDate(g.fecha) || '', LEFT_X + 1, y)
  doc.text(truncateText(doc, g.descripcion || g.comercio || '', 29), LEFT_X + 22, y)
  const subNombre = getSubNombre(g, categorias)
  doc.setFont('times', 'bold')
  doc.text(truncateText(doc, subNombre.toUpperCase(), 18), LEFT_X + 54, y)
  doc.text(fmtAmount(g.importe), CDIV_X - 1, y, { align: 'right' })
  doc.setFont('times', 'normal')
}

function drawHotelRow(doc, g, y) {
  doc.setFont('times', 'normal')
  doc.setFontSize(7)
  doc.text(fmtDate(g.fecha) || '', LEFT_X + 1, y)
  doc.text(truncateText(doc, g.comercio || '', 18), LEFT_X + 22, y)
  doc.text(truncateText(doc, g.descripcion || '', 22), LEFT_X + 43, y)
  // Número: leave blank
  doc.setFont('times', 'bold')
  doc.text(fmtAmount(g.importe), CDIV_X - 1, y, { align: 'right' })
  doc.setFont('times', 'normal')
}

function drawRestauranteRow(doc, g, y) {
  doc.setFont('times', 'normal')
  doc.setFontSize(7)
  doc.text(fmtDate(g.fecha) || '', LEFT_X + 1, y)
  const personas = String((g.comensales || []).filter(c => c && c.trim()).length || 1)
  doc.text(personas, LEFT_X + 22, y)
  doc.setFont('times', 'bold')
  doc.text(fmtAmount(g.importe), CDIV_X - 1, y, { align: 'right' })
  doc.setFont('times', 'normal')
}

function drawKmRow(doc, g, y) {
  doc.setFont('times', 'normal')
  doc.setFontSize(7)
  doc.text(fmtDate(g.fecha) || '', RIGHT_X + 1, y)
  doc.text(truncateText(doc, g.descripcion || '', 26), RIGHT_X + 22, y)
  const trayecto = [g.origen, g.destino].filter(Boolean).join(' - ')
  doc.text(truncateText(doc, trayecto, 22), RIGHT_X + 52, y)
  doc.setFont('times', 'bold')
  doc.text(String(g.distanciaKm || ''), BOX_X + BOX_W - 1, y, { align: 'right' })
  doc.setFont('times', 'normal')
}

function drawInvitacionRow(doc, g, y) {
  doc.setFont('times', 'normal')
  doc.setFontSize(7)
  doc.text(fmtDate(g.fecha) || '', RIGHT_X + 1, y)
  const personas = String((g.comensales || []).filter(c => c && c.trim()).length || 1)
  doc.text(personas, RIGHT_X + 17, y)
  doc.setFont('times', 'bold')
  doc.text(fmtAmount(g.importe), RSUB_DIV_X - 1, y, { align: 'right' })
  doc.setFont('times', 'normal')
}

function drawVarRow(doc, g, y, categorias) {
  doc.setFont('times', 'normal')
  doc.setFontSize(7)
  doc.text(fmtDate(g.fecha) || '', RVAR_X + 1, y)
  const concepto = g.comercio || g.descripcion || getSubNombre(g, categorias)
  doc.text(truncateText(doc, concepto, 18), RVAR_X + 17, y)
  doc.setFont('times', 'bold')
  doc.text(fmtAmount(g.importe), BOX_X + BOX_W - 1, y, { align: 'right' })
  doc.setFont('times', 'normal')
}

// ─── Ticket images ───────────────────────────────────────────────────────────

async function drawTicketImages(doc, gastosConImagen, categorias) {
  if (gastosConImagen.length === 0) return

  const IMGS_PER_ROW = 2
  const ROWS_PER_PAGE = 2
  const IMG_MAX_W = 85
  const IMG_MAX_H = 95
  const IMG_START_X = [10, 110]
  const IMG_START_Y = [12, 130]
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
          const raw = g.imagenBlob || g.imagenMiniatura
          if (!raw) continue

          const b64 = raw.replace(/^data:image\/\w+;base64,/, '')
          const fmt = raw.startsWith('data:image/png') ? 'PNG' : 'JPEG'

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

              // Comensales line
              const comensalesStr = (g.comensales || []).filter(c => c && c.trim()).join(', ')
              if (comensalesStr) {
                doc.setFontSize(6)
                doc.setTextColor(100, 100, 100)
                doc.text(
                  truncateText(doc, `Comensales: ${comensalesStr}`, IMG_MAX_W),
                  baseX + IMG_MAX_W / 2,
                  baseY + IMG_MAX_H + CAPTION_OFFSET + 4,
                  { align: 'center' }
                )
                doc.setTextColor(0, 0, 0)
              }

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

  const [year, month] = mes.split('-').map(Number)
  const pad2 = n => String(n).padStart(2, '0')
  const periodoInicio = `${year}-${pad2(month)}-01`
  const lastD = new Date(year, month, 0).getDate()
  const periodoFin = `${year}-${pad2(month)}-${pad2(lastD)}`

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setFont('times', 'normal')

  // Classify gastos into sections
  const sections = {
    locomocion: [],
    hoteles: [],
    restaurantes: [],
    kilometraje: [],
    invitaciones: [],
    varios: [],
  }

  for (const g of gastos) {
    const sec = getSeccionPDF(g, categorias)
    if (sections[sec]) {
      sections[sec].push(g)
    } else {
      sections.varios.push(g)
    }
  }

  // Sort each section by fecha
  for (const k of Object.keys(sections)) {
    sections[k].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
  }

  // Draw page 1 structure
  drawHeader(doc, perfil, periodoInicio, periodoFin)
  drawPageFrame(doc)
  drawSectionTitles(doc)
  drawColumnHeaders(doc)

  // ── MEDIOS DE LOCOMOCIÓN ──
  let locY = locomocion_data_y
  for (const g of sections.locomocion) {
    if (locY > locomocion_max_y) break
    drawLocomocionRow(doc, g, locY, categorias)
    locY += ROW_H
    const names = (g.comensales || []).filter(c => c && c.trim()).join(', ')
    if (names) {
      drawComensalesLine(doc, names, LEFT_X + 2, locY)
      locY += 3.5
    }
  }
  const locTotal = sections.locomocion.reduce((s, g) => s + (parseFloat(g.importe) || 0), 0)
  if (locTotal > 0) drawTotalLine(doc, 'Desplazamientos', locTotal, CDIV_X - 1, Math.min(locY + 1, LEFT_SEP1 - 4))

  // ── HOTELES ──
  let hotY = hoteles_data_y
  for (const g of sections.hoteles) {
    if (hotY > hoteles_max_y) break
    drawHotelRow(doc, g, hotY)
    hotY += ROW_H
  }
  const hotTotal = sections.hoteles.reduce((s, g) => s + (parseFloat(g.importe) || 0), 0)
  if (hotTotal > 0) drawTotalLine(doc, 'Hoteles', hotTotal, CDIV_X - 1, Math.min(hotY + 1, LEFT_SEP2 - 4))

  // ── RESTAURANTES ──
  let restY = restaurantes_data_y
  for (const g of sections.restaurantes) {
    if (restY > restaurantes_max_y) break
    drawRestauranteRow(doc, g, restY)
    restY += ROW_H
    const names = (g.comensales || []).filter(c => c && c.trim()).join(', ')
    if (names) {
      drawComensalesLine(doc, names, LEFT_X + 2, restY)
      restY += 3.5
    }
  }
  const restTotal = sections.restaurantes.reduce((s, g) => s + (parseFloat(g.importe) || 0), 0)
  if (restTotal > 0) drawTotalLine(doc, 'Restaurantes', restTotal, CDIV_X - 1, Math.min(restY + 1, BOX_BOTTOM - 8))

  // ── COMPENSACIONES KILOMÉTRICAS ──
  let kmY = compkm_data_y
  for (const g of sections.kilometraje) {
    if (kmY > compkm_max_y) break
    drawKmRow(doc, g, kmY)
    kmY += ROW_H
  }

  // ── INVITACIONES ──
  let invY = inv_data_y
  for (const g of sections.invitaciones) {
    if (invY > inv_max_y) break
    drawInvitacionRow(doc, g, invY)
    invY += ROW_H
    const names = (g.comensales || []).filter(c => c && c.trim()).join(', ')
    if (names) {
      drawComensalesLine(doc, names, RIGHT_X + 1, invY, RSUB_DIV_X - RIGHT_X - 2)
      invY += 3.5
    }
  }
  const invTotal = sections.invitaciones.reduce((s, g) => s + (parseFloat(g.importe) || 0), 0)
  if (invTotal > 0) drawTotalLine(doc, 'Invitaciones', invTotal, RSUB_DIV_X - 1, Math.min(invY + 1, LIQ_LINE1_Y - 4), RIGHT_X)

  // ── VARIOS ──
  let varY = varios_data_y
  for (const g of sections.varios) {
    if (varY > varios_max_y) break
    drawVarRow(doc, g, varY, categorias)
    varY += ROW_H
  }
  const varTotal = sections.varios.reduce((s, g) => s + (parseFloat(g.importe) || 0), 0)
  if (varTotal > 0) drawTotalLine(doc, 'Varios', varTotal, BOX_X + BOX_W - 1, Math.min(varY + 1, LIQ_LINE1_Y - 4), RVAR_X)

  // ── Liquidación + signatures ──
  // km section is excluded from money total (it has no monetary section total in the template)
  const totalGastos = ['locomocion', 'hoteles', 'restaurantes', 'invitaciones', 'varios']
    .flatMap(k => sections[k])
    .reduce((s, g) => s + (parseFloat(g.importe) || 0), 0)

  drawLiquidacion(doc, totalGastos)
  drawSignatureArea(doc)
  drawFooterNote(doc)

  // ── Ticket image pages ──
  const gastosConImagen = gastos.filter(g => !g.esKilometraje && (g.imagenBlob || g.imagenMiniatura))
  await drawTicketImages(doc, gastosConImagen, categorias)

  return doc
}
