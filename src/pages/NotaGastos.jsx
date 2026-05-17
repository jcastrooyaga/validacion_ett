import { useState, useMemo } from 'react'
import { useGastos } from '../hooks/useGastos'
import { useCategories } from '../hooks/useCategories'
import { useToast } from '../components/Toast'
import { getPerfil, getConfigOneDrive } from '../services/storage'
import { getDirHandle } from '../services/db'

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
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [previewFilename, setPreviewFilename] = useState(null)
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

  /**
   * Performs the actual save/share of a PDF doc.
   * Returns true if successfully handled (shared, saved to folder, or downloaded).
   */
  async function performSave(doc, filename) {
    // Try to save to stored folder handle (desktop Chrome/Edge)
    let savedToFolder = false
    try {
      const dirHandle = await getDirHandle()
      if (dirHandle) {
        const perm = await dirHandle.queryPermission({ mode: 'readwrite' })
        if (perm === 'granted') {
          const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
          const writable = await fileHandle.createWritable()
          const pdfBlob = doc.output('blob')
          await writable.write(pdfBlob)
          await writable.close()
          savedToFolder = true
          toast.success(`PDF guardado en ${dirHandle.name}`)
        }
      }
    } catch (folderErr) {
      console.warn('Could not save to folder:', folderErr)
    }

    if (savedToFolder) return true

    // Try Web Share API first (iOS Safari)
    let shared = false
    try {
      if (navigator.canShare) {
        const pdfBlob = doc.output('blob')
        const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' })
        if (navigator.canShare({ files: [pdfFile] })) {
          const rutaOneDrive = getConfigOneDrive().rutaOneDrive
          await navigator.share({
            files: [pdfFile],
            title: `Nota de gastos ${mes}`,
            text: rutaOneDrive ? `Guardar en: ${rutaOneDrive}` : undefined,
          })
          shared = true
          toast.success('PDF compartido')
        }
      }
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') {
        shared = true // User cancelled, don't download
      }
      // Other share errors: fall through to download
    }

    if (!shared) {
      doc.save(filename)
      toast.success('PDF generado y descargado')
    }

    return true
  }

  const handleGenerarPDF = async () => {
    if (gastos.length === 0) {
      toast.warning('No hay gastos en este periodo')
      return
    }
    setGenerating(true)
    try {
      const perfil = getPerfil()
      const { generatePDF } = await import('../services/pdf')
      const doc = await generatePDF(gastos, mes, categorias)
      const nombreArchivo = `nota_gastos_${mes}_${(perfil.nombreCompleto || 'usuario').replace(/\s+/g, '_').toLowerCase()}.pdf`

      // Create blob URL for preview
      const blob = doc.output('blob')
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setPreviewDoc(doc)
      setPreviewFilename(nombreArchivo)
      setGenerating(false)
      return // Don't save yet — wait for user to confirm from preview
    } catch (err) {
      console.error('PDF generation error:', err?.message, err?.stack)
      toast.error(`Error al generar el PDF: ${err?.message || 'Error desconocido'}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveFromPreview = async () => {
    if (!previewDoc || !previewFilename) return
    setSaving(true)
    try {
      await performSave(previewDoc, previewFilename)
    } catch (err) {
      console.error('Save error:', err)
      toast.error(`Error al guardar: ${err?.message || 'Error desconocido'}`)
    } finally {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setPreviewDoc(null)
      setPreviewFilename(null)
      setSaving(false)
    }
  }

  const handleClosePreview = () => {
    URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewDoc(null)
    setPreviewFilename(null)
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
                <h2 className="text-sm font-semibold text-gray-700">Resumen por categor&#237;a</h2>
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
              disabled={generating}
              className="w-full py-4 rounded-xl bg-primary text-white font-semibold text-base flex items-center justify-center gap-2 hover:bg-primary-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" />
                  Generando...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  Generar PDF
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* PDF Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
          {/* Modal header */}
          <div className="bg-white flex items-center justify-between px-4 py-3 shrink-0">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Vista previa del PDF</p>
              <p className="text-xs text-gray-500">{previewFilename}</p>
            </div>
            <button
              onClick={handleClosePreview}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* PDF iframe (works on desktop Chrome; on iOS opens blank but "Abrir" button works) */}
          <iframe
            src={previewUrl}
            className="flex-1 w-full border-0"
            title="Vista previa PDF"
          />

          {/* iOS fallback button + save button */}
          <div className="bg-white px-4 py-4 flex gap-3 safe-bottom shrink-0 border-t border-gray-100">
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-3 rounded-xl border border-primary text-primary font-semibold text-sm text-center"
            >
              Abrir PDF
            </a>
            <button
              onClick={handleSaveFromPreview}
              disabled={saving}
              className="flex-[2] py-3 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar / Compartir'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
