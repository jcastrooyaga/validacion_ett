import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { saveGasto } from '../services/db'
import { getConfigKm } from '../services/storage'
import { useToast } from '../components/Toast'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function Kilometraje() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const state = location.state || {}

  const configKm = getConfigKm()
  const precioPorKm = configKm.precioPorKm || 0.26

  const [form, setForm] = useState({
    origen: '',
    destino: '',
    distanciaKm: '',
    fecha: todayStr(),
    descripcion: '',
  })
  const [saving, setSaving] = useState(false)

  const handleField = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
  }

  const km = parseFloat(form.distanciaKm) || 0
  const total = km * precioPorKm

  const handleConfirm = async () => {
    if (!form.origen || !form.destino || !form.distanciaKm) {
      toast.error('Rellena origen, destino y kilómetros')
      return
    }

    setSaving(true)
    try {
      const now = new Date()
      const mes = form.fecha.slice(0, 7)
      const id = uuidv4()

      const gasto = {
        id,
        fecha: form.fecha,
        mes,
        categoriaId: state.categoria?.id || 'desplazamientos',
        subcategoriaId: state.subcategoria?.id || 'kilometraje',
        importe: parseFloat(total.toFixed(2)),
        importeIVA: 0,
        comercio: `${form.origen} → ${form.destino}`,
        descripcion: form.descripcion,
        imagenBlob: null,
        imagenMiniatura: null,
        estadoIA: 'manual',
        proveedorIA: null,
        comensales: [],
        esKilometraje: true,
        origen: form.origen,
        destino: form.destino,
        distanciaKm: km,
        precioPorKm,
        pendienteIA: false,
        creadoEn: now.toISOString(),
        archivado: false,
      }

      await saveGasto(gasto)
      toast.success('Kilometraje guardado')
      navigate('/')
    } catch (err) {
      toast.error('Error al guardar')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen min-h-dvh bg-gray-50 flex flex-col max-w-[480px] mx-auto">
      {/* Header */}
      <header className="bg-primary text-white px-4 pt-6 pb-4 flex items-center gap-3 safe-top">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">Kilometraje</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Price info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm text-blue-700">
            Precio/km configurado: {precioPorKm.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €/km
          </span>
          <span className="text-xs text-blue-400">Cambiar en Ajustes</span>
        </div>

        {/* Calc display */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">
            {km > 0
              ? `${km.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} km × ${precioPorKm.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €/km`
              : `Introduce los kilómetros para calcular`}
          </p>
          <p className="text-4xl font-bold text-primary">
            {total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </p>
          {km > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {km.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} km × {precioPorKm.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €/km = {total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </p>
          )}
        </div>

        {/* Origen */}
        <FormField label="Origen">
          <input
            type="text"
            value={form.origen}
            onChange={e => handleField('origen', e.target.value)}
            placeholder="Ciudad o dirección de origen"
            className="input-field"
          />
        </FormField>

        {/* Destino */}
        <FormField label="Destino">
          <input
            type="text"
            value={form.destino}
            onChange={e => handleField('destino', e.target.value)}
            placeholder="Ciudad o dirección de destino"
            className="input-field"
          />
        </FormField>

        {/* Kilómetros */}
        <FormField label="Kilómetros">
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.distanciaKm}
            onChange={e => handleField('distanciaKm', e.target.value)}
            placeholder="0"
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

        {/* Descripcion */}
        <FormField label="Descripción">
          <textarea
            value={form.descripcion}
            onChange={e => handleField('descripcion', e.target.value)}
            placeholder="Motivo del desplazamiento"
            rows={3}
            className="input-field resize-none"
          />
        </FormField>

        {/* Actions */}
        <div className="flex gap-3 pt-2 pb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm bg-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !form.origen || !form.destino || !form.distanciaKm}
            className="flex-grow-[2] py-3 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar kilometraje'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}
