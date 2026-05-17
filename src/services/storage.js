import { defaultCategories } from '../data/defaultCategories'

// Keys
const KEYS = {
  PERFIL: 'perfil',
  CONFIG_IA: 'configIA',
  CONFIG_KM: 'configKm',
  CATEGORIAS: 'categorias',
}

// Helpers
function getItem(key, fallback = null) {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : fallback
  } catch {
    return fallback
  }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('localStorage setItem error', e)
  }
}

// Perfil
export function getPerfil() {
  return getItem(KEYS.PERFIL, { nombreCompleto: '', rangoFechasPredefinido: 'mes_natural' })
}

export function setPerfil(perfil) {
  setItem(KEYS.PERFIL, perfil)
}

// Config IA
export function getConfigIA() {
  return getItem(KEYS.CONFIG_IA, {
    proveedorActivo: 'claude',
    proveedores: {
      claude: { apiKey: '' },
      chatgpt: { apiKey: '' },
      perplexity: { apiKey: '' },
    },
  })
}

export function setConfigIA(config) {
  setItem(KEYS.CONFIG_IA, config)
}

// Config Km
export function getConfigKm() {
  return getItem(KEYS.CONFIG_KM, { precioPorKm: 0.26 })
}

export function setConfigKm(config) {
  setItem(KEYS.CONFIG_KM, config)
}

// Categorias
export function getCategorias() {
  return getItem(KEYS.CATEGORIAS, defaultCategories)
}

export function setCategorias(categorias) {
  setItem(KEYS.CATEGORIAS, categorias)
}

export function resetCategorias() {
  setItem(KEYS.CATEGORIAS, defaultCategories)
}

export function getSubcategoria(categoriaId, subcategoriaId) {
  const cats = getCategorias()
  const cat = cats.find(c => c.id === categoriaId)
  if (!cat) return null
  return cat.subcategorias.find(s => s.id === subcategoriaId) || null
}
