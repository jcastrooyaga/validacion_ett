export default function LimitIndicator({ limite, importe }) {
  if (limite === null || limite === undefined) return null

  const amount = parseFloat(importe) || 0
  const isOver = amount > limite
  const percentage = limite > 0 ? Math.min((amount / limite) * 100, 100) : 0

  return (
    <div className={`rounded-lg p-3 ${isOver ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-medium ${isOver ? 'text-red-700' : 'text-green-700'}`}>
          Límite de la categoría
        </span>
        <span className={`text-xs font-bold ${isOver ? 'text-red-700' : 'text-green-700'}`}>
          {amount.toFixed(2)} € / {limite.toFixed(2)} €
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isOver && (
        <p className="text-xs text-red-600 mt-1 font-medium">
          ⚠ Importe supera el límite permitido. No se puede guardar.
        </p>
      )}
    </div>
  )
}
