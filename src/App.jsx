import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import NuevoGasto from './pages/NuevoGasto'
import RevisarTicket from './pages/RevisarTicket'
import Kilometraje from './pages/Kilometraje'
import Historial from './pages/Historial'
import NotaGastos from './pages/NotaGastos'
import Ajustes from './pages/Ajustes'
import { ToastProvider, useToast } from './components/Toast'
import { processPendingTickets } from './services/ai/AIService'
import { getCategorias } from './services/storage'
import { migrateGastosCategorias } from './services/db'

function OfflineQueueProcessor() {
  const toast = useToast()

  useEffect(() => {
    async function process() {
      try {
        const categorias = getCategorias()
        const count = await processPendingTickets(categorias)
        if (count > 0) {
          toast.success(`${count} ticket${count > 1 ? 's' : ''} analizado${count > 1 ? 's' : ''}. Revisa y confirma en Historial.`)
        }
      } catch (err) {
        console.error('Error processing pending tickets', err)
      }
    }

    // Process on mount if already online
    if (navigator.onLine) {
      process()
    }

    const handleOnline = () => {
      process()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  return null
}

export default function App() {
  useEffect(() => {
    migrateGastosCategorias().catch(console.error)
  }, [])

  return (
    <BrowserRouter>
      <ToastProvider>
        <OfflineQueueProcessor />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="historial" element={<Historial />} />
            <Route path="nota" element={<NotaGastos />} />
            <Route path="ajustes" element={<Ajustes />} />
          </Route>
          <Route path="/nuevo" element={<NuevoGasto />} />
          <Route path="/revisar/:id" element={<RevisarTicket />} />
          <Route path="/kilometraje" element={<Kilometraje />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
