import { useState, useMemo } from 'react'
import { useGastos } from '../hooks/useGastos'
import { useCategories } from '../hooks/useCategories'
import { useToast } from '../components/Toast'

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

export default function NotaGastos() {
  const [mes, setMes] = useState(getMesStr(new Date()))
  const { gastos, loading } = useGastos(mes)
  const { categorias, getCategoria, getSubcategoria } = useCategories()
  const toast = useToast()

  const isCurrentMonth = mes === getMesStr(new Date())

  const resumenPorCategoria = useMemo(() => {
    const groups = {}
    for (const g of gastos) {
      const catId = g.categoriaId || 'sin_categoria'
      if (!groups[catId]) {
        const cat = getCategoria(catId)
        groups[catId] = { nombre: cat?.nombre || catId, subtotal: 0, items: [] }
      }
      groups[catId].subtotal += parseFloat(g.importe) || 0
      groups[catId].items.push(g)
    }
    return Object.entries(groups).sort((a, b) => b[1].subtotal - a[1].subtotal)
  }, [gastos, getCategoria])

  const total = useMemo(() => gastos.reduce((s, g) => s + (parseFloat(g.importe) || 0), 0), [gastos])

  const handleGenerarPDF = () => {
    toast.info('Generación de PDF: Próximamente')
  }

  return (
    <div className="max-w-[480px] mx-auto">
      {/* Header */}
      <header className="bg-primary text-white px-4 pt-6 pb-4 safe-top">
        <h1 className="text-xl font-bold mb-3">Nota de gastos</h1>
        {/* Month selector */}
        <div className="flex items-center justify-between bg-white/15 rounded-xl px-3 py-2">
          <button onClick={() => setMes(m => addMonths(m, -1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-sm font-semibold capitalize">{getMesDisplay(mes)}</span>
          <button onClick={() => setMes(m => addMonths(m, 1))} disabled={isCurrentMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 disabled:opacity-30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </header>

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full inline-block" />
          </div>
        ) : gastos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5} className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-gray-500">Sin gastos en este periodo</p>
          </div>
        ) : (
          <>
            {/* Summary table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Resumen por categoría</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {resumenPorCategoria.map(([catId, data]) => (
                  <div key={catId} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800">{data.nombre}</span>
                      <span className="text-sm font-bold text-gray-900">{data.subtotal.toFixed(2)} €</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {data.items.map(g => {
                        const sub = getSubcategoria(catId, g.subcategoriaId)
                        return (
                          <div key={g.id} className="flex items-center justify-between text-xs text-gray-500">
                            <span className="truncate max-w-[200px]">
                              {g.comercio || sub?.nombre || g.descripcion || '–'}
                              {g.fecha && ` · ${g.fecha.slice(5).split('-').reverse().join('/')}`}
                            </span>
                            <span className="shrink-0 ml-2">{parseFloat(g.importe || 0).toFixed(2)} €</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {/* Total row */}
              <div className="px-4 py-3 bg-primary/5 border-t-2 border-primary/20 flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">TOTAL</span>
                <span className="text-base font-bold text-primary">{total.toFixed(2)} €</span>
              </div>
            </div>

            {/* PDF button */}
            <button
              onClick={handleGenerarPDF}
              className="w-full py-4 rounded-xl bg-primary text-white font-semibold text-base flex items-center justify-center gap-2 hover:bg-primary-light transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Generar PDF
            </button>
          </>
        )}
      </div>
    </div>
  )
}
