import { useState, useEffect, useCallback } from 'react'
import { getCategorias, setCategorias, resetCategorias } from '../services/storage'
import { defaultCategories } from '../data/defaultCategories'

export function useCategories() {
  const [categorias, setCats] = useState([])

  useEffect(() => {
    setCats(getCategorias())
  }, [])

  const saveCategorias = useCallback((newCats) => {
    setCategorias(newCats)
    setCats(newCats)
  }, [])

  // Merge default categories without overwriting existing ones
  const reset = useCallback((currentCats) => {
    const base = currentCats || getCategorias()
    const merged = [...base]
    for (const def of defaultCategories) {
      const existing = merged.find(c => c.id === def.id)
      if (!existing) {
        merged.push(def)
      } else {
        // Add missing subcategories
        const mergedSubs = [...existing.subcategorias]
        for (const defSub of def.subcategorias) {
          if (!mergedSubs.find(s => s.id === defSub.id)) {
            mergedSubs.push(defSub)
          }
        }
        const idx = merged.indexOf(existing)
        merged[idx] = { ...existing, subcategorias: mergedSubs }
      }
    }
    setCategorias(merged)
    setCats(merged)
  }, [])

  // Hard reset to defaults only
  const resetToDefaults = useCallback(() => {
    resetCategorias()
    setCats(getCategorias())
  }, [])

  const getCategoria = useCallback((id) => {
    return categorias.find(c => c.id === id) || null
  }, [categorias])

  // Alias for clarity
  const getCategoriaById = getCategoria

  const getSubcategoria = useCallback((categoriaId, subcategoriaId) => {
    const cat = categorias.find(c => c.id === categoriaId)
    if (!cat) return null
    return cat.subcategorias.find(s => s.id === subcategoriaId) || null
  }, [categorias])

  // Alias for clarity
  const getSubcategoriaById = getSubcategoria

  const moveCategoria = useCallback((id, direction) => {
    const idx = categorias.findIndex(c => c.id === id)
    if (idx === -1) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= categorias.length) return
    const newCats = [...categorias]
    ;[newCats[idx], newCats[newIdx]] = [newCats[newIdx], newCats[idx]]
    saveCategorias(newCats)
  }, [categorias, saveCategorias])

  const addCategoria = useCallback((cat) => {
    const newCats = [...categorias, cat]
    saveCategorias(newCats)
  }, [categorias, saveCategorias])

  const updateCategoria = useCallback((id, updates) => {
    const newCats = categorias.map(c => c.id === id ? { ...c, ...updates } : c)
    saveCategorias(newCats)
  }, [categorias, saveCategorias])

  const removeCategoria = useCallback((id) => {
    const newCats = categorias.filter(c => c.id !== id)
    saveCategorias(newCats)
  }, [categorias, saveCategorias])

  const archiveCategoria = useCallback((id) => {
    const newCats = categorias.map(c => c.id === id ? { ...c, archivada: true } : c)
    saveCategorias(newCats)
  }, [categorias, saveCategorias])

  const addSubcategoria = useCallback((categoriaId, sub) => {
    const newCats = categorias.map(c => {
      if (c.id === categoriaId) {
        return { ...c, subcategorias: [...c.subcategorias, sub] }
      }
      return c
    })
    saveCategorias(newCats)
  }, [categorias, saveCategorias])

  const updateSubcategoria = useCallback((categoriaId, subId, updates) => {
    const newCats = categorias.map(c => {
      if (c.id === categoriaId) {
        return {
          ...c,
          subcategorias: c.subcategorias.map(s => s.id === subId ? { ...s, ...updates } : s)
        }
      }
      return c
    })
    saveCategorias(newCats)
  }, [categorias, saveCategorias])

  const removeSubcategoria = useCallback((categoriaId, subId) => {
    const newCats = categorias.map(c => {
      if (c.id === categoriaId) {
        return { ...c, subcategorias: c.subcategorias.filter(s => s.id !== subId) }
      }
      return c
    })
    saveCategorias(newCats)
  }, [categorias, saveCategorias])

  const archiveSubcategoria = useCallback((categoriaId, subId) => {
    const newCats = categorias.map(c => {
      if (c.id === categoriaId) {
        return {
          ...c,
          subcategorias: c.subcategorias.map(s => s.id === subId ? { ...s, archivada: true } : s)
        }
      }
      return c
    })
    saveCategorias(newCats)
  }, [categorias, saveCategorias])

  const moveSubcategoria = useCallback((categoriaId, subId, direction) => {
    const newCats = categorias.map(c => {
      if (c.id !== categoriaId) return c
      const subs = [...c.subcategorias]
      const idx = subs.findIndex(s => s.id === subId)
      if (idx === -1) return c
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= subs.length) return c
      ;[subs[idx], subs[newIdx]] = [subs[newIdx], subs[idx]]
      return { ...c, subcategorias: subs }
    })
    saveCategorias(newCats)
  }, [categorias, saveCategorias])

  return {
    categorias,
    saveCategorias,
    getCategoria,
    getCategoriaById,
    getSubcategoria,
    getSubcategoriaById,
    addCategoria,
    updateCategoria,
    removeCategoria,
    archiveCategoria,
    moveCategoria,
    addSubcategoria,
    updateSubcategoria,
    removeSubcategoria,
    archiveSubcategoria,
    moveSubcategoria,
    reset,
    resetToDefaults,
  }
}
