import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function formatAmount(amount) {
  return parseFloat(amount || 0).toFixed(2)
}

export default function GastoCard({ gasto, categoriaName, subcategoriaName, onDelete, showDate = true }) {
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = (e) => {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete(gasto.id)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  const handleEdit = () => {
    navigate(`/revisar/${gasto.id}`)
  }

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleEdit}
    >
      {/* Thumbnail or icon */}
      <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
        {gasto.imagenMiniatura ? (
          <img
            src={gasto.imagenMiniatura}
            alt="Ticket"
            className="w-full h-full object-cover"
          />
        ) : gasto.esKilometraje ? (
          <span className="text-2xl">📍</span>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {gasto.comercio || gasto.descripcion || subcategoriaName || 'Sin nombre'}
          </p>
          <span className="text-sm font-bold text-gray-900 shrink-0">
            {formatAmount(gasto.importe)} €
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {categoriaName && (
            <span className="inline-block text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
              {subcategoriaName || categoriaName}
            </span>
          )}
          {showDate && gasto.fecha && (
            <span className="text-xs text-gray-400 shrink-0">{formatDate(gasto.fecha)}</span>
          )}
          {gasto.esKilometraje && gasto.distanciaKm && (
            <span className="text-xs text-gray-400">{gasto.distanciaKm} km</span>
          )}
        </div>
      </div>

      {/* Delete button */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className={`shrink-0 ml-1 w-8 h-8 rounded-full flex items-center justify-center transition-colors
            ${confirmDelete ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500'}`}
          aria-label="Eliminar"
        >
          {confirmDelete ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          )}
        </button>
      )}
    </div>
  )
}
