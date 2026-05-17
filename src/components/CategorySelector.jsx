import { useCategories } from '../hooks/useCategories'

const categoryEmojis = {
  desplazamientos: '🚗',
  manutencion: '🍽️',
  representacion: '🤝',
  alojamiento: '🏨',
  material: '📎',
  formacion: '📚',
  otros: '📋',
}

const subcategoryEmojis = {
  taxi: '🚕',
  tren: '🚆',
  avion: '✈️',
  gasolina: '⛽',
  kilometraje: '📍',
  desayuno: '☕',
  comida: '🍽️',
  cena: '🌙',
  restaurante: '🍴',
  invitacion: '🎉',
  hotel: '🏨',
  material_oficina: '📎',
  curso: '📚',
  otros_gastos: '📋',
}

export default function CategorySelector({ onSelect }) {
  const { categorias } = useCategories()

  return (
    <div className="grid grid-cols-2 gap-3">
      {categorias.map(cat => (
        <CategoryCard
          key={cat.id}
          categoria={cat}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function CategoryCard({ categoria, onSelect }) {
  const emoji = categoryEmojis[categoria.id] || '📋'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <span className="text-xs font-semibold text-gray-700 truncate">{categoria.nombre}</span>
      </div>
      <div className="p-2 flex flex-col gap-1">
        {categoria.subcategorias.map(sub => (
          <button
            key={sub.id}
            onClick={() => onSelect(categoria, sub)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-primary/5 active:bg-primary/10 transition-colors"
          >
            <span className="text-base">{subcategoryEmojis[sub.id] || '•'}</span>
            <span className="text-sm text-gray-700 truncate">{sub.nombre}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
