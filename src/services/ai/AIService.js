import { getConfigIA } from '../storage'
import { getPendingIA, saveGasto } from '../db'
import ClaudeAdapter from './ClaudeAdapter'
import OpenAIAdapter from './OpenAIAdapter'
import PerplexityAdapter from './PerplexityAdapter'

function getAdapter(apiKey, provider) {
  switch (provider) {
    case 'claude':
      return new ClaudeAdapter(apiKey)
    case 'chatgpt':
      return new OpenAIAdapter(apiKey)
    case 'perplexity':
      return new PerplexityAdapter(apiKey)
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

export async function extractTicketData(imageBase64, mimeType, categorias) {
  const config = getConfigIA()
  const provider = config.proveedorActivo || 'claude'
  const apiKey = config.proveedores?.[provider]?.apiKey
  if (!apiKey) throw new Error(`No API key configured for provider: ${provider}`)
  const adapter = getAdapter(apiKey, provider)
  return adapter.extractTicketData(imageBase64, mimeType, categorias)
}

export async function testConnection(provider) {
  try {
    const config = getConfigIA()
    const apiKey = config.proveedores?.[provider]?.apiKey
    if (!apiKey) return { ok: false, message: 'No hay API key configurada' }
    const adapter = getAdapter(apiKey, provider)
    await adapter.testConnection()
    return { ok: true, message: 'Conexión correcta' }
  } catch (err) {
    return { ok: false, message: err.message || 'Error de conexión' }
  }
}

export async function processPendingTickets(categorias) {
  const pending = await getPendingIA()
  let count = 0

  for (const gasto of pending) {
    try {
      const imageBase64 = gasto.imagenBlob
      if (!imageBase64) continue

      const result = await extractTicketData(imageBase64, 'image/jpeg', categorias)

      const updated = {
        ...gasto,
        comercio: result.comercio ?? gasto.comercio,
        fecha: result.fecha ?? gasto.fecha,
        importe: result.importe_total ?? gasto.importe,
        importeIVA: result.importe_iva ?? gasto.importeIVA,
        descripcion: result.descripcion_sugerida ?? gasto.descripcion,
        estadoIA: 'procesado_pendiente_confirmacion',
        pendienteIA: false,
        confianzaIA: result.confianza,
        proveedorIA: getConfigIA().proveedorActivo,
      }

      // Apply category suggestion if valid
      if (result.categoria_sugerida && categorias) {
        const catMatch = categorias.find(
          c => c.id === result.categoria_sugerida || c.nombre.toLowerCase().includes(result.categoria_sugerida.toLowerCase())
        )
        if (catMatch) {
          updated.categoriaId = catMatch.id
          // Apply subcategory suggestion if valid
          if (result.subcategoria_sugerida) {
            const subMatch = catMatch.subcategorias?.find(
              s => s.id === result.subcategoria_sugerida
            )
            if (subMatch) updated.subcategoriaId = subMatch.id
          }
        }
      }

      await saveGasto(updated)
      count++
    } catch (err) {
      console.error('Error processing pending ticket', gasto.id, err)
    }
  }

  return count
}
