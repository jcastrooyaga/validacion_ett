import { useState, useMemo } from 'react'
import { useGastos } from '../hooks/useGastos'
import { useCategories } from '../hooks/useCategories'
import { useToast } from '../components/Toast'
import FAB from '../components/FAB'

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

export default function Home() {
  const currentMes = getMesStr(new Date())
  const [mes, setMes] = useState(currentMes)
  const { gastos, loading } = useGastos(mes)
  const { categorias } = useCategories()
  const toast = useToast()

  const pending = useMemo(
    () => gastos.filter(g => g.pendienteIA || g.estadoIA === 'procesado_pendiente_confirmacion'),
    [gastos]
  )

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
    // Sort by category order from settings
    return categorias
      .filter(cat => groups[cat.id])
      .map(cat => ({ catId: cat.id, nombre: cat.nombre, items: groups[cat.id] }))
      .concat(
        Object.keys(groups)
          .filter(k => !categorias.find(c => c.id === k))
          .map(k => ({ catId: k, nombre: k, items: groups[k] }))
      )
  }, [gastos, categorias])

  const mesDisplay = getMesDisplay(mes)

  return (
    <div className="max-w-[480px] mx-auto">
      {/* Header */}
      <header className="bg-primary text-white px-4 pt-6 pb-5 safe-top">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-green-200 capitalize">{mesDisplay}</p>
            <p className="text-3xl font-bold mt-0.5">{totalAccumulado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
            <p className="text-sm text-green-200 mt-0.5">Total acumulado</p>
          </div>
          {pending.length > 0 && (
            <div className="flex flex-col items-center bg-amber-500 rounded-xl px-3 py-2">
              <span className="text-xl font-bold">{pending.length}</span>
              <span className="text-xs">pendiente{pending.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        {/* Month selector */}
        <div className="flex items-center justify-between bg-white/15 rounded-xl px-3 py-2">
          <button onClick={() => setMes(m => addMonths(m, -1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-sm font-semibold capitalize">{mesDisplay}</span>
          <button onClick={() => setMes(m => addMonths(m, 1))} disabled={mes === currentMes} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 disabled:opacity-30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <span className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full inline-block" />
          </div>
        ) : gastos.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mx-4 mt-4">
            {gastosByCategoria.map(({ catId, nombre, items }) => {
              const subtotal = items.reduce((s, g) => s + (parseFloat(g.importe) || 0), 0)
              return (
                <div key={catId} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{nombre}</span>
                  <span className="text-sm font-semibold text-gray-900">{subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
              )
            })}
            <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-t-2 border-primary/20">
              <span className="text-base font-bold text-gray-900">TOTAL</span>
              <span className="text-base font-bold text-primary">{totalAccumulado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
            </div>
          </div>
        )}
      </div>

      <FAB />
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
