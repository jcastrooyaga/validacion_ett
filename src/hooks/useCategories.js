import { useState, useEffect, useCallback } from 'react'
import { getCategorias, setCategorias, resetCategorias } from '../services/storage'

export function useCategories() {
  const [categorias, setCats] = useState([])

  useEffect(() => {
    setCats(getCategorias())
  }, [])

  const saveCategorias = useCallback((newCats) => {
    setCategorias(newCats)
    setCats(newCats)
  }, [])

  const reset = useCallback(() => {
    resetCategorias()
    setCats(getCategorias())
  }, [])

  const getCategoria = useCallback((id) => {
    return categorias.find(c => c.id === id) || null
  }, [categorias])

  const getSubcategoria = useCallback((categoriaId, subcategoriaId) => {
    const cat = categorias.find(c => c.id === categoriaId)
    if (!cat) return null
    return cat.subcategorias.find(s => s.id === subcategoriaId) || null
  }, [categorias])

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

  return {
    categorias,
    getCategoria,
    getSubcategoria,
    addCategoria,
    updateCategoria,
    removeCategoria,
    addSubcategoria,
    updateSubcategoria,
    removeSubcategoria,
    reset,
  }
}
