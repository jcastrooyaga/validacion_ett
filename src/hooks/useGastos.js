import { useState, useEffect, useCallback } from 'react'
import { getAllGastos, getGastosByMes, saveGasto, deleteGasto } from '../services/db'

export function useGastos(mes = null) {
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = mes ? await getGastosByMes(mes) : await getAllGastos()
      setGastos(data.filter(g => !g.archivado).sort((a, b) => b.fecha.localeCompare(a.fecha)))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [mes])

  useEffect(() => {
    load()
  }, [load])

  const addOrUpdate = useCallback(async (gasto) => {
    await saveGasto(gasto)
    await load()
  }, [load])

  const remove = useCallback(async (id) => {
    await deleteGasto(id)
    await load()
  }, [load])

  return { gastos, loading, error, reload: load, addOrUpdate, remove }
}

export function useCurrentMonthGastos() {
  const now = new Date()
  const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return useGastos(mes)
}
