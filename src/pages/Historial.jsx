import { useState, useMemo } from 'react'
import { useGastos } from '../hooks/useGastos'
import { useCategories } from '../hooks/useCategories'
import { useToast } from '../components/Toast'
import GastoCard from '../components/GastoCard'

function getMesStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getMesDisplay(mesStr) {
  const [year, month] = mesStr.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return date.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
}

function addMonths(mesStr, delta) {
  const [year, month] = mesStr.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return getMesStr(date)
}

export default function Historial() {
  const [mes, setMes] = useState(getMesStr(new Date()))
  const [filtroCategoria, setFiltroCategoria] = useState(null)
  const { gastos, loading, remove } = useGastos(mes)
  const { categorias, getCategoria, getSubcategoria } = useCategories()
  const toast = useToast()

  const filteredGastos = useMemo(() => {
    if (!filtroCategoria) return gastos
    return gastos.filter(g => g.categoriaId === filtroCategoria)
  }, [gastos, filtroCategoria])

  const categoriaIdsUsadas = useMemo(() => {
    const ids = new Set(gastos.map(g => g.categoriaId))
    return [...ids]
  }, [gastos])

  const handleDelete = async (id) => {
    try {
      await remove(id)
      toast.success('Gasto eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const prevMes = () => setMes(m => addMonths(m, -1))
  const nextMes = () => setMes(m => addMonths(m, 1))
  const isCurrentMonth = mes === getMesStr(new Date())

  const total = useMemo(() => filteredGastos.reduce((s, g) => s + (parseFloat(g.importe) || 0), 0), [filteredGastos])

  return (
    <div className="max-w-[480px] mx-auto">
      {/* Header */}
      <header className="bg-primary text-white px-4 pt-6 pb-4 safe-top">
        <h1 className="text-xl font-bold mb-3">Historial</h1>
        {/* Month selector */}
        <div className="flex items-center justify-between bg-white/15 rounded-xl px-3 py-2">
          <button onClick={prevMes} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-sm font-semibold capitalize">{getMesDisplay(mes)}</span>
          <button onClick={nextMes} disabled={isCurrentMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 disabled:opacity-30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </header>

      <div className="px-4 py-4">
        {/* Category filter chips */}
        {categoriaIdsUsadas.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            <button
              onClick={() => setFiltroCategoria(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
                ${!filtroCategoria ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              Todos
            </button>
            {categoriaIdsUsadas.map(catId => {
              const cat = getCategoria(catId)
              return (
                <button
                  key={catId}
                  onClick={() => setFiltroCategoria(catId === filtroCategoria ? null : catId)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
                    ${filtroCategoria === catId ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                >
                  {cat?.nombre || catId}
                </button>
              )
            })}
          </div>
        )}

        {/* Summary */}
        {filteredGastos.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">{filteredGastos.length} gasto{filteredGastos.length !== 1 ? 's' : ''}</span>
            <span className="text-sm font-bold text-gray-800">{total.toFixed(2)} €</span>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <span className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full inline-block" />
          </div>
        ) : filteredGastos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5} className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500">Sin gastos en este periodo</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredGastos.map(g => {
              const cat = getCategoria(g.categoriaId)
              const sub = getSubcategoria(g.categoriaId, g.subcategoriaId)
              return (
                <GastoCard
                  key={g.id}
                  gasto={g}
                  categoriaName={cat?.nombre}
                  subcategoriaName={sub?.nombre}
                  onDelete={handleDelete}
                  showDate
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
