import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import NuevoGasto from './pages/NuevoGasto'
import RevisarTicket from './pages/RevisarTicket'
import Kilometraje from './pages/Kilometraje'
import Historial from './pages/Historial'
import NotaGastos from './pages/NotaGastos'
import Ajustes from './pages/Ajustes'
import { ToastProvider } from './components/Toast'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
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
