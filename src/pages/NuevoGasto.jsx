import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { saveGasto } from '../services/db'
import { compressImage, createThumbnail, createFullImage } from '../services/db'
import { useToast } from '../components/Toast'
import CategorySelector from '../components/CategorySelector'

export default function NuevoGasto() {
  const navigate = useNavigate()
  const toast = useToast()
  const fileInputRef = useRef(null)
  const [selectedCat, setSelectedCat] = useState(null)
  const [selectedSub, setSelectedSub] = useState(null)
  const [step, setStep] = useState('category') // 'category' | 'photo'
  const [loading, setLoading] = useState(false)

  const handleCategorySelect = (cat, sub) => {
    setSelectedCat(cat)
    setSelectedSub(sub)

    if (sub.esKilometraje) {
      navigate('/kilometraje', { state: { categoria: cat, subcategoria: sub } })
      return
    }

    if (sub.tieneTicket) {
      setStep('photo')
    } else {
      // No ticket needed, go directly to form with new ID
      const id = uuidv4()
      navigate(`/revisar/${id}`, {
        state: {
          isNew: true,
          categoriaId: cat.id,
          subcategoriaId: sub.id,
          hasImage: false,
        },
      })
    }
  }

  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const [imagenBlob, imagenMiniatura] = await Promise.all([
        createFullImage(file),
        createThumbnail(file),
      ])

      const id = uuidv4()
      const now = new Date()
      const fecha = now.toISOString().slice(0, 10)
      const mes = fecha.slice(0, 7)

      const gasto = {
        id,
        fecha,
        mes,
        categoriaId: selectedCat.id,
        subcategoriaId: selectedSub.id,
        importe: 0,
        importeIVA: 0,
        comercio: '',
        descripcion: '',
        imagenBlob,
        imagenMiniatura,
        estadoIA: 'pendiente',
        proveedorIA: null,
        comensales: [],
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

      navigate(`/revisar/${id}`, {
        state: {
          isNew: false,
          categoriaId: selectedCat.id,
          subcategoriaId: selectedSub.id,
          hasImage: true,
        },
      })
    } catch (err) {
      toast.error('Error al procesar la imagen')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSkipPhoto = () => {
    const id = uuidv4()
    navigate(`/revisar/${id}`, {
      state: {
        isNew: true,
        categoriaId: selectedCat.id,
        subcategoriaId: selectedSub.id,
        hasImage: false,
      },
    })
  }

  return (
    <div className="min-h-screen min-h-dvh bg-gray-50 flex flex-col max-w-[480px] mx-auto">
      {/* Header */}
      <header className="bg-primary text-white px-4 pt-6 pb-4 flex items-center gap-3 safe-top">
        <button
          onClick={() => {
            if (step === 'photo') setStep('category')
            else navigate(-1)
          }}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">
          {step === 'category' ? 'Nuevo gasto' : 'Añadir ticket'}
        </h1>
      </header>

      <div className="flex-1 px-4 py-4 overflow-y-auto">
        {step === 'category' ? (
          <>
            <p className="text-sm text-gray-500 mb-4">Selecciona la categoría del gasto</p>
            <CategorySelector onSelect={handleCategorySelect} />
          </>
        ) : (
          <PhotoStep
            categoria={selectedCat}
            subcategoria={selectedSub}
            fileInputRef={fileInputRef}
            onCapture={handlePhotoCapture}
            onSkip={handleSkipPhoto}
            loading={loading}
          />
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoCapture}
      />
    </div>
  )
}

function PhotoStep({ categoria, subcategoria, fileInputRef, onCapture, onSkip, loading }) {
  return (
    <div className="flex flex-col items-center gap-6 pt-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1a6b3c" strokeWidth={1.5} className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800">{subcategoria?.nombre}</h2>
        <p className="text-sm text-gray-500">{categoria?.nombre}</p>
      </div>

      <div className="w-full flex flex-col gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              Hacer foto del ticket
            </>
          )}
        </button>

        <button
          onClick={onSkip}
          disabled={loading}
          className="w-full bg-white text-gray-700 border border-gray-200 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          Introducir manualmente
        </button>
      </div>
    </div>
  )
}
