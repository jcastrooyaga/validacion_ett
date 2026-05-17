import { openDB } from 'idb'

const DB_NAME = 'maradona-db'
const DB_VERSION = 2
const STORE_NAME = 'gastos'

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('mes', 'mes')
          store.createIndex('fecha', 'fecha')
          store.createIndex('categoriaId', 'categoriaId')
          store.createIndex('subcategoriaId', 'subcategoriaId')
          store.createIndex('pendienteIA', 'pendienteIA')
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('config')) {
            db.createObjectStore('config')
          }
        }
      },
    })
  }
  return dbPromise
}

export async function getAllGastos() {
  const db = await getDB()
  return db.getAll(STORE_NAME)
}

export async function getGastosByMes(mes) {
  const db = await getDB()
  return db.getAllFromIndex(STORE_NAME, 'mes', mes)
}

export async function getGasto(id) {
  const db = await getDB()
  return db.get(STORE_NAME, id)
}

export async function saveGasto(gasto) {
  const db = await getDB()
  const result = await db.put(STORE_NAME, gasto)
  window.dispatchEvent(new CustomEvent('gastosUpdated'))
  return result
}

export async function deleteGasto(id) {
  const db = await getDB()
  const result = await db.delete(STORE_NAME, id)
  window.dispatchEvent(new CustomEvent('gastosUpdated'))
  return result
}

export async function getPendingIA() {
  const db = await getDB()
  return db.getAllFromIndex(STORE_NAME, 'pendienteIA', true)
}

export async function exportAllData() {
  const gastos = await getAllGastos()
  return { gastos, exportedAt: new Date().toISOString() }
}

export async function importData(data) {
  if (!data || !Array.isArray(data.gastos)) throw new Error('Formato inválido')
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  for (const gasto of data.gastos) {
    await tx.store.put(gasto)
  }
  await tx.done
}

// Image compression helpers
export async function compressImage(file, maxDimension = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width
          width = maxDimension
        } else if (height > width && height > maxDimension) {
          width = (width * maxDimension) / height
          height = maxDimension
        } else if (width > maxDimension || height > maxDimension) {
          const ratio = maxDimension / Math.max(width, height)
          width = width * ratio
          height = height * ratio
        }
        canvas.width = Math.round(width)
        canvas.height = Math.round(height)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function createThumbnail(file) {
  return compressImage(file, 200, 0.7)
}

export async function createFullImage(file) {
  return compressImage(file, 1024, 0.85)
}

export async function storeDirHandle(handle) {
  const db = await getDB()
  return db.put('config', handle, 'dirHandle')
}

export async function getDirHandle() {
  try {
    const db = await getDB()
    return await db.get('config', 'dirHandle')
  } catch {
    return null
  }
}

export async function migrateGastosCategorias() {
  const migKey = 'migration_v3_gastos_done'
  if (localStorage.getItem(migKey)) return

  const db = await getDB()
  const all = await db.getAll(STORE_NAME)
  const catMap = {
    'desplazamientos': 'locomocion',
    'manutencion':     'restaurantes',
    'representacion':  'invitaciones',
    'alojamiento':     'hoteles',
    'material':        'varios',
    'formacion':       'varios',
    'otros':           'varios',
  }
  // Special case: kilometraje subcat moves to compensaciones_km
  const tx = db.transaction(STORE_NAME, 'readwrite')
  for (const g of all) {
    let changed = false
    if (g.subcategoriaId === 'kilometraje' && g.categoriaId === 'desplazamientos') {
      g.categoriaId = 'compensaciones_km'
      changed = true
    } else if (catMap[g.categoriaId]) {
      g.categoriaId = catMap[g.categoriaId]
      changed = true
    }
    if (changed) await tx.store.put(g)
  }
  await tx.done
  localStorage.setItem(migKey, '1')
}
