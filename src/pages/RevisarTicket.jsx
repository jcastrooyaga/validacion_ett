import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { getGasto, saveGasto, deleteGasto } from '../services/db'
import { useCategories } from '../hooks/useCategories'
import { getPerfil, getConfigIA, getConfigOneDrive } from '../services/storage'
import { useToast } from '../components/Toast'
import LimitIndicator from '../components/LimitIndicator'
import { extractTicketData } from '../services/ai/AIService'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const PROVIDER_LABELS = {
  claude: 'Claude (Anthropic)',
  chatgpt: 'ChatGPT (OpenAI)',
  perplexity: 'Perplexity',
}

const CONFIDENCE_STYLES = {
  alta: 'bg-green-100 text-green-700 border-green-200',
  media: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  baja: 'bg-red-100 text-red-600 border-red-200',
}

export default function RevisarTicket() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const { categorias, getCategoria, getSubcategoria } = useCategories()
  const state = location.state || {}

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [zoomImage, setZoomImage] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [confianzaIA, setConfianzaIA] = useState(null)

  const [form, setForm] = useState({
    categoriaId: state.categoriaId || '',
    subcategoriaId: state.subcategoriaId || '',
    comercio: '',
    fecha: todayStr(),
    importe: '',
    importeIVA: '',
    descripcion: '',
    comensales: [],
  })
  const [imagenBlob, setImagenBlob] = useState(null)
  const [imagenMiniatura, setImagenMiniatura] = useState(null)
  const [isExisting, setIsExisting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const gasto = await getGasto(id)
        if (gasto) {
          setIsExisting(true)
          setForm({
            categoriaId: gasto.categoriaId || state.categoriaId || '',
            subcategoriaId: gasto.subcategoriaId || state.subcategoriaId || '',
            comercio: gasto.comercio || '',
            fecha: gasto.fecha || todayStr(),
            importe: gasto.importe ? String(gasto.importe) : '',
            importeIVA: gasto.importeIVA ? String(gasto.importeIVA) : '',
            descripcion: gasto.descripcion || '',
            comensales: gasto.comensales || [],
          })
          setImagenBlob(gasto.imagenBlob || null)
          setImagenMiniatura(gasto.imagenMiniatura || null)

          // If we should run AI analysis, do it now
          if (state.analyzing && gasto.imagenBlob) {
            setAnalyzing(true)
            runAIAnalysis(gasto, categorias)
          }
        } else {
          // New gasto
          const perfil = getPerfil()
          const initComensales = []
          const sub = getSubcategoria(state.categoriaId, state.subcategoriaId)
          if (sub?.tieneComensales && perfil.nombreCompleto) {
            initComensales.push(perfil.nombreCompleto)
          }
          setForm(f => ({
            ...f,
            categoriaId: state.categoriaId || '',
            subcategoriaId: state.subcategoriaId || '',
            comensales: initComensales,
          }))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function runAIAnalysis(gasto, cats) {
    const config = getConfigIA()
    const provider = config.proveedorActivo || 'claude'
    try {
      const result = await extractTicketData(gasto.imagenBlob, 'image/jpeg', cats)

      // Build updated gasto record
      const updated = {
        ...gasto,
        comercio: result.comercio ?? gasto.comercio,
        fecha: result.fecha ?? gasto.fecha,
        importe: result.importe_total ?? gasto.importe,
        importeIVA: result.importe_iva ?? gasto.importeIVA,
        descripcion: result.descripcion_sugerida ?? gasto.descripcion,
        estadoIA: 'confirmado',
        proveedorIA: provider,
        pendienteIA: false,
        confianzaIA: result.confianza,
      }

      // Resolve category from suggestion
      let resolvedCatId = gasto.categoriaId
      let resolvedSubId = gasto.subcategoriaId

      if (result.categoria_sugerida && cats) {
        const catMatch = cats.find(
          c =>
            c.id === result.categoria_sugerida ||
            c.nombre.toLowerCase().includes(result.categoria_sugerida.toLowerCase())
        )
        if (catMatch) {
          resolvedCatId = catMatch.id
          if (result.subcategoria_sugerida) {
            const subMatch = catMatch.subcategorias?.find(
              s => s.id === result.subcategoria_sugerida
            )
            if (subMatch) resolvedSubId = subMatch.id
          }
        }
      }

      updated.categoriaId = resolvedCatId
      updated.subcategoriaId = resolvedSubId

      await saveGasto(updated)

      // Update local form state
      setForm(f => ({
        ...f,
        categoriaId: resolvedCatId,
        subcategoriaId: resolvedSubId,
        comercio: result.comercio ?? f.comercio,
        fecha: result.fecha ?? f.fecha,
        importe: result.importe_total != null ? String(result.importe_total) : f.importe,
        importeIVA: result.importe_iva != null ? String(result.importe_iva) : f.importeIVA,
        descripcion: result.descripcion_sugerida ?? f.descripcion,
      }))

      setConfianzaIA(result.confianza)
    } catch (err) {
      console.error('AI analysis failed', err)
      toast.error('No se pudo analizar el ticket automáticamente. Introduce los datos manualmente.')
    } finally {
      setAnalyzing(false)
    }
  }

  const currentSub = getSubcategoria(form.categoriaId, form.subcategoriaId)
  const currentCat = getCategoria(form.categoriaId)
  const numComensales = (currentSub?.tieneComensales && form.comensales.length > 0)
    ? form.comensales.filter(c => c.trim()).length
    : 1
  const limiteEfectivo = currentSub?.limite != null
    ? currentSub.limite * numComensales
    : null
  const isOverLimit = limiteEfectivo != null && parseFloat(form.importe || 0) > limiteEfectivo

  const handleField = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
  }

  const handleCatChange = (catId) => {
    const cat = getCategoria(catId)
    const firstSub = cat?.subcategorias?.[0]
    const perfil = getPerfil()
    const initComensales = firstSub?.tieneComensales && perfil.nombreCompleto ? [perfil.nombreCompleto] : []
    setForm(f => ({ ...f, categoriaId: catId, subcategoriaId: firstSub?.id || '', comensales: initComensales }))
  }

  const handleSubcatChange = (subId) => {
    const sub = getSubcategoria(form.categoriaId, subId)
    const perfil = getPerfil()
    const initComensales = sub?.tieneComensales && perfil.nombreCompleto ? [perfil.nombreCompleto] : []
    setForm(f => ({ ...f, subcategoriaId: subId, comensales: initComensales }))
  }

  const handleAddComensales = () => {
    setForm(f => ({ ...f, comensales: [...f.comensales, ''] }))
  }

  const handleComensalChange = (idx, value) => {
    const updated = [...form.comensales]
    updated[idx] = value
    setForm(f => ({ ...f, comensales: updated }))
  }

  const handleRemoveComensal = (idx) => {
    const perfil = getPerfil()
    if (idx === 0 && form.comensales[0] === perfil.nombreCompleto) return
    setForm(f => ({ ...f, comensales: f.comensales.filter((_, i) => i !== idx) }))
  }

  const handleConfirm = async () => {
    if (!form.categoriaId || !form.subcategoriaId) {
      toast.error('Selecciona categoría y subcategoría')
      return
    }
    if (isOverLimit) {
      toast.error('El importe supera el límite permitido')
      return
    }

    setSaving(true)
    try {
      const now = new Date()
      const mes = form.fecha.slice(0, 7)
      const gasto = {
        id,
        fecha: form.fecha,
        mes,
        categoriaId: form.categoriaId,
        subcategoriaId: form.subcategoriaId,
        importe: parseFloat(form.importe) || 0,
        importeIVA: parseFloat(form.importeIVA) || 0,
        comercio: form.comercio,
        descripcion: form.descripcion,
        imagenBlob: imagenBlob || null,
        imagenMiniatura: imagenMiniatura || null,
        estadoIA: isExisting ? 'confirmado' : 'manual',
        proveedorIA: null,
        comensales: form.comensales.filter(c => c.trim()),
        esKilometraje: false,
        origen: null,
        destino: null,
        distanciaKm: null,
        precioPorKm: null,
        pendienteIA: false,
        creadoEn: now.toISOString(),
        archivado: false,
      }
      await saveGasto(gasto)
      toast.success('Gasto guardado')

      if (imagenBlob && navigator.canShare) {
        try {
          const res = await fetch(imagenBlob)
          const blob = await res.blob()
          const file = new File([blob], `ticket_${form.fecha}.jpg`, { type: 'image/jpeg' })
          if (navigator.canShare({ files: [file] })) {
            const rutaOneDrive = getConfigOneDrive().rutaOneDrive
            try {
              await navigator.share({
                files: [file],
                title: `Ticket ${form.comercio || form.fecha}`,
                text: rutaOneDrive ? `Guardar en: ${rutaOneDrive}` : undefined,
              })
            } catch (err) {
              // User cancelled or share failed — gasto is already saved
            }
          }
        } catch (err) {
          // fetch/share error — gasto is already saved
        }
      }

      navigate('/')
    } catch (err) {
      toast.error('Error al guardar')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = async () => {
    if (state.isNew === false && isExisting) {
      try {
        await deleteGasto(id)
      } catch {}
    }
    navigate(-1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const perfil = getPerfil()
  const showComensales = currentSub?.tieneComensales
  const config = getConfigIA()
  const providerLabel = PROVIDER_LABELS[config.proveedorActivo] || config.proveedorActivo

  return (
    <div className="min-h-screen min-h-dvh bg-gray-50 flex flex-col max-w-[480px] mx-auto">
      {/* Header */}
      <header className="bg-primary text-white px-4 pt-6 pb-4 flex items-center gap-3 safe-top">
        <button
          onClick={handleDiscard}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold flex-1">
          {isExisting ? 'Revisar ticket' : 'Nuevo gasto'}
        </h1>
        <button
          onClick={handleConfirm}
          disabled={saving || analyzing || isOverLimit || !form.categoriaId}
          className="px-4 py-1.5 bg-white text-primary font-semibold rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? '...' : 'Guardar'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto relative">
        {/* Image */}
        {imagenBlob && (
          <div className="relative bg-black">
            <img
              src={imagenBlob}
              alt="Ticket"
              className="w-full max-h-64 object-contain cursor-zoom-in"
              onClick={() => setZoomImage(true)}
            />
          </div>
        )}

        {/* AI analysis spinner overlay */}
        {analyzing && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10 gap-3">
            <span className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
            <p className="text-sm font-semibold text-gray-700">Analizando ticket...</p>
            <p className="text-xs text-gray-400">{providerLabel}</p>
          </div>
        )}

        <div className="px-4 py-4 flex flex-col gap-4">
          {/* Offline notice */}
          {state.offline && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              Sin conexion — introduce los datos manualmente. Se analizara automaticamente al reconectar.
            </div>
          )}

          {/* Confidence badge */}
          {confianzaIA && !analyzing && (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${CONFIDENCE_STYLES[confianzaIA] || CONFIDENCE_STYLES.baja}`}>
                IA: {confianzaIA}
              </span>
              <span className="text-xs text-gray-400">Confianza del analisis automatico</span>
            </div>
          )}

          {/* Categoria */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoria</label>
            <select
              value={form.categoriaId}
              onChange={e => handleCatChange(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Selecciona categoria</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>

          {/* Subcategoria */}
          {form.categoriaId && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Subcategoria</label>
              <select
                value={form.subcategoriaId}
                onChange={e => handleSubcatChange(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Selecciona subcategoria</option>
                {getCategoria(form.categoriaId)?.subcategorias?.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Comercio */}
          <FormField label="Comercio">
            <input
              type="text"
              value={form.comercio}
              onChange={e => handleField('comercio', e.target.value)}
              placeholder="Nombre del establecimiento"
              className="input-field"
            />
          </FormField>

          {/* Fecha */}
          <FormField label="Fecha">
            <input
              type="date"
              value={form.fecha}
              onChange={e => handleField('fecha', e.target.value)}
              className="input-field"
            />
          </FormField>

          {/* Importe y IVA */}
          <div className="flex gap-3">
            <FormField label="Importe total (€)" className="flex-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.importe}
                onChange={e => handleField('importe', e.target.value)}
                placeholder="0.00"
                className="input-field"
              />
            </FormField>
            <FormField label="IVA (€)" className="flex-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.importeIVA}
                onChange={e => handleField('importeIVA', e.target.value)}
                placeholder="0.00"
                className="input-field"
              />
            </FormField>
          </div>

          {/* Limit indicator */}
          {limiteEfectivo != null && (
            <LimitIndicator
              limite={limiteEfectivo}
              importe={parseFloat(form.importe) || 0}
              desglose={currentSub?.tieneComensales && numComensales > 1
                ? `${numComensales} comensales × ${currentSub.limite.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
                : null}
            />
          )}

          {/* Descripcion */}
          <FormField label="Descripcion">
            <textarea
              value={form.descripcion}
              onChange={e => handleField('descripcion', e.target.value)}
              placeholder="Descripcion del gasto"
              rows={3}
              className="input-field resize-none"
            />
          </FormField>

          {/* Comensales */}
          {showComensales && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Comensales</label>
              {/* Stepper */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">Número de comensales:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (form.comensales.length > 1) {
                        setForm(f => ({ ...f, comensales: f.comensales.slice(0, -1) }))
                      }
                    }}
                    disabled={form.comensales.length <= 1}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center disabled:opacity-30"
                  >−</button>
                  <span className="w-6 text-center font-semibold">{form.comensales.length}</span>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, comensales: [...f.comensales, ''] }))}
                    className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center"
                  >+</button>
                </div>
              </div>
              {/* Name fields */}
              {form.comensales.map((c, idx) => {
                const isProfile = idx === 0
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      value={c}
                      onChange={e => handleComensalChange(idx, e.target.value)}
                      readOnly={isProfile}
                      placeholder={isProfile ? perfil.nombreCompleto || 'Tu nombre' : `Comensal ${idx + 1}`}
                      className={`flex-1 input-field ${isProfile ? 'bg-gray-50 text-gray-500' : ''}`}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {/* Bottom actions */}
          <div className="flex gap-3 pt-2 pb-4">
            <button
              onClick={handleDiscard}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm bg-white"
            >
              Descartar
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving || analyzing || isOverLimit || !form.categoriaId}
              className="flex-2 flex-grow-[2] py-3 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : analyzing ? 'Analizando...' : 'Confirmar gasto'}
            </button>
          </div>
        </div>
      </div>

      {/* Zoom image modal */}
      {zoomImage && imagenBlob && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setZoomImage(false)}
        >
          <img src={imagenBlob} alt="Ticket zoom" className="max-w-full max-h-full object-contain" />
          <button
            onClick={() => setZoomImage(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

function FormField({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}
