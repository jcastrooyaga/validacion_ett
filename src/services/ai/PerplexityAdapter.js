import AIAdapter from './AIAdapter'

const ENDPOINT = 'https://api.perplexity.ai/chat/completions'
const MODEL = 'llama-3.1-sonar-large-128k-online'

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
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(cleaned)
}

function stripDataUrlPrefix(imageBase64) {
  const idx = imageBase64.indexOf(',')
  if (idx !== -1) return imageBase64.slice(idx + 1)
  return imageBase64
}

export default class PerplexityAdapter extends AIAdapter {
  constructor(apiKey) {
    super()
    this.apiKey = apiKey
  }

  async extractTicketData(imageBase64, mimeType, categorias) {
    // Perplexity may not support image vision — attempt with image URL format
    // If it fails, return null fields with low confidence
    const rawBase64 = stripDataUrlPrefix(imageBase64)
    const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${rawBase64}`

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: dataUrl },
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
          errorBody?.error?.message ||
            `Perplexity API error: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content || ''
      return parseResponse(text)
    } catch {
      // Perplexity doesn't support vision — return null fields with low confidence
      return {
        comercio: null,
        fecha: null,
        importe_total: null,
        importe_iva: null,
        descripcion_sugerida: null,
        categoria_sugerida: null,
        subcategoria_sugerida: null,
        confianza: 'baja',
      }
    }
  }

  async testConnection() {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
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
        errorBody?.error?.message ||
          `Perplexity API error: ${response.status} ${response.statusText}`
      )
    }

    return true
  }
}
