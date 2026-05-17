import { useMemo } from 'react'
import { useCurrentMonthGastos } from '../hooks/useGastos'
import { useCategories } from '../hooks/useCategories'
import { useToast } from '../components/Toast'
import GastoCard from '../components/GastoCard'
import FAB from '../components/FAB'

function getCurrentMonthName() {
  const now = new Date()
  return now.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
}

function getCurrentMes() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function Home() {
  const { gastos, loading, remove } = useCurrentMonthGastos()
  const { getCategoria, getSubcategoria } = useCategories()
  const toast = useToast()

  const pending = useMemo(() => gastos.filter(g => g.pendienteIA), [gastos])

  const totalAccumulado = useMemo(() => {
    return gastos.reduce((sum, g) => sum + (parseFloat(g.importe) || 0), 0)
  }, [gastos])

  const gastosByCategoria = useMemo(() => {
    const groups = {}
    for (const g of gastos) {
      const key = g.categoriaId || 'sin_categoria'
      if (!groups[key]) groups[key] = []
      groups[key].push(g)
    }
    return groups
  }, [gastos])

  const handleDelete = async (id) => {
    try {
      await remove(id)
      toast.success('Gasto eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const monthName = getCurrentMonthName()

  return (
    <div className="max-w-[480px] mx-auto">
      {/* Header */}
      <header className="bg-primary text-white px-4 pt-6 pb-5 safe-top">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-green-200 capitalize">{monthName}</p>
            <p className="text-3xl font-bold mt-0.5">{totalAccumulado.toFixed(2)} €</p>
            <p className="text-sm text-green-200 mt-0.5">Total acumulado</p>
          </div>
          {pending.length > 0 && (
            <div className="flex flex-col items-center bg-amber-500 rounded-xl px-3 py-2">
              <span className="text-xl font-bold">{pending.length}</span>
              <span className="text-xs">pendiente{pending.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <span className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full inline-block" />
          </div>
        ) : gastos.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-6">
            {Object.entries(gastosByCategoria).map(([catId, items]) => {
              const cat = getCategoria(catId)
              return (
                <CategoryGroup
                  key={catId}
                  categoriaName={cat?.nombre || catId}
                  gastos={items}
                  getSubcategoria={getSubcategoria}
                  catId={catId}
                  onDelete={handleDelete}
                />
              )
            })}
          </div>
        )}
      </div>

      <FAB />
    </div>
  )
}

function CategoryGroup({ categoriaName, gastos, getSubcategoria, catId, onDelete }) {
  const subtotal = gastos.reduce((s, g) => s + (parseFloat(g.importe) || 0), 0)
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{categoriaName}</h2>
        <span className="text-sm font-semibold text-gray-700">{subtotal.toFixed(2)} €</span>
      </div>
      <div className="flex flex-col gap-2">
        {gastos.map(g => {
          const sub = getSubcategoria(catId, g.subcategoriaId)
          return (
            <GastoCard
              key={g.id}
              gasto={g}
              categoriaName={categoriaName}
              subcategoriaName={sub?.nombre}
              onDelete={onDelete}
            />
          )
        })}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5} className="w-10 h-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
        </svg>
      </div>
      <div>
        <p className="text-gray-500 font-medium">Sin gastos este mes</p>
        <p className="text-gray-400 text-sm mt-1">Pulsa + para añadir tu primer gasto</p>
      </div>
    </div>
  )
}
