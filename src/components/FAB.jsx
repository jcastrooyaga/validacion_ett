import { useNavigate } from 'react-router-dom'

export default function FAB({ onClick }) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      navigate('/nuevo')
    }
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg
        flex items-center justify-center text-2xl font-light z-30
        hover:bg-primary-light active:scale-95 transition-all"
      aria-label="Añadir gasto"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>
  )
}
