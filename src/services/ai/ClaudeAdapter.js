import AIAdapter from './AIAdapter'

const ENDPOINT = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-5'

const EXTRACTION_PROMPT = `Eres un asistente especializado en leer tickets y facturas.
Analiza la imagen adjunta y extrae la siguiente información en JSON estricto:

{
  "comercio": "nombre del establecimiento o null",
  "fecha": "YYYY-MM-DD o null",
  "importe_total": 00.00,
  "importe_iva": 00.00,
  "descripcion_sugerida": "descripción breve del gasto",
  "categoria_sugerida": "desplazamientos | manutencion | representacion | alojamiento | material | formacion | otros",
  "subcategoria_sugerida": "id de la subcategoría más probable",
  "confianza": "alta | media | baja"
}

Si algún campo no es legible, usa null. No añadas ningún texto fuera del JSON.`

function parseResponse(text) {
  let cleaned = text.trim()
  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(cleaned)
}

function stripDataUrlPrefix(imageBase64) {
  // Remove data URL prefix like "data:image/jpeg;base64,"
  const idx = imageBase64.indexOf(',')
  if (idx !== -1) return imageBase64.slice(idx + 1)
  return imageBase64
}

export default class ClaudeAdapter extends AIAdapter {
  constructor(apiKey) {
    super()
    this.apiKey = apiKey
  }

  async extractTicketData(imageBase64, mimeType, categorias) {
    const rawBase64 = stripDataUrlPrefix(imageBase64)

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType || 'image/jpeg',
                  data: rawBase64,
                },
              },
              {
                type: 'text',
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      throw new Error(
        errorBody?.error?.message || `Claude API error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    return parseResponse(text)
  }

  async testConnection() {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      throw new Error(
        errorBody?.error?.message || `Claude API error: ${response.status} ${response.statusText}`
      )
    }

    return true
  }
}
