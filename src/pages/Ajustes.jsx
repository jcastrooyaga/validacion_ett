import { useState, useRef } from 'react'
import { useCategories } from '../hooks/useCategories'
import { getPerfil, setPerfil, getConfigIA, setConfigIA, getConfigKm, setConfigKm } from '../services/storage'
import { exportAllData, importData, getAllGastos } from '../services/db'
import { useToast } from '../components/Toast'
import { v4 as uuidv4 } from 'uuid'
import { testConnection } from '../services/ai/AIService'

const SECCIONES_PDF = [
  { value: 'locomocion', label: 'Locomoción' },
  { value: 'kilometraje', label: 'Kilometraje' },
  { value: 'hoteles', label: 'Hoteles' },
  { value: 'restaurantes', label: 'Restaurantes' },
  { value: 'invitaciones', label: 'Invitaciones' },
  { value: 'varios', label: 'Varios' },
]

const TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'ia', label: 'IA' },
  { id: 'km', label: 'Km' },
  { id: 'categorias', label: 'Categorías' },
  { id: 'datos', label: 'Datos' },
]

export default function Ajustes() {
  const [activeTab, setActiveTab] = useState('perfil')
  const toast = useToast()

  return (
    <div className="max-w-[480px] mx-auto">
      <header className="bg-primary text-white px-4 pt-6 pb-4 safe-top">
        <h1 className="text-xl font-bold">Ajustes</h1>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-2 flex overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {activeTab === 'perfil' && <TabPerfil toast={toast} />}
        {activeTab === 'ia' && <TabIA toast={toast} />}
        {activeTab === 'km' && <TabKm toast={toast} />}
        {activeTab === 'categorias' && <TabCategorias toast={toast} />}
        {activeTab === 'datos' && <TabDatos toast={toast} />}
      </div>
    </div>
  )
}

// ------- Tab Perfil -------
function TabPerfil({ toast }) {
  const [perfil, setPerfilState] = useState(getPerfil)
  const [logoPreview, setLogoPreview] = useState(() => {
    try { return localStorage.getItem('logoEmpresa') || null } catch { return null }
  })

  const handleSave = () => {
    setPerfil(perfil)
    toast.success('Perfil guardado')
  }

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const b64 = ev.target.result
      localStorage.setItem('logoEmpresa', b64)
      setLogoPreview(b64)
      toast.success('Logo guardado')
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-4">
      <Section title="Datos personales">
        <FormField label="Nombre completo">
          <input
            type="text"
            value={perfil.nombreCompleto}
            onChange={e => setPerfilState(p => ({ ...p, nombreCompleto: e.target.value }))}
            placeholder="Tu nombre y apellidos"
            className="input-field"
          />
        </FormField>
      </Section>

      <Section title="Logo de empresa">
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-gray-200" />
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center">
              Sin logo
            </div>
          )}
          <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-200">
            Subir logo
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </label>
        </div>
      </Section>

      <button onClick={handleSave} className="w-full py-3 bg-primary text-white rounded-xl font-semibold">
        Guardar perfil
      </button>
    </div>
  )
}

// ------- Tab IA -------
function TabIA({ toast }) {
  const [config, setConfig] = useState(getConfigIA)
  const [showKeys, setShowKeys] = useState({})
  const [testingProvider, setTestingProvider] = useState(null)
  const [testResults, setTestResults] = useState({})

  const handleSave = () => {
    setConfigIA(config)
    toast.success('Configuracion de IA guardada')
  }

  const handleApiKey = (proveedor, key) => {
    setConfig(c => ({
      ...c,
      proveedores: { ...c.proveedores, [proveedor]: { ...c.proveedores[proveedor], apiKey: key } }
    }))
  }

  const toggleShow = (p) => setShowKeys(s => ({ ...s, [p]: !s[p] }))

  const handleTestConnection = async (providerId) => {
    // Save current config first so testConnection reads the latest keys
    setConfigIA(config)
    setTestingProvider(providerId)
    setTestResults(r => ({ ...r, [providerId]: null }))
    try {
      const result = await testConnection(providerId)
      setTestResults(r => ({ ...r, [providerId]: result }))
    } finally {
      setTestingProvider(null)
    }
  }

  const proveedores = [
    { id: 'claude', label: 'Claude (Anthropic)' },
    { id: 'chatgpt', label: 'ChatGPT (OpenAI)' },
    { id: 'perplexity', label: 'Perplexity' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Section title="Proveedor activo">
        <div className="flex flex-col gap-2">
          {proveedores.map(p => (
            <label key={p.id} className="flex items-center gap-3 py-2 cursor-pointer">
              <input
                type="radio"
                name="proveedor"
                value={p.id}
                checked={config.proveedorActivo === p.id}
                onChange={() => setConfig(c => ({ ...c, proveedorActivo: p.id }))}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm text-gray-700">{p.label}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="API Keys">
        {proveedores.map(p => (
          <div key={p.id} className="flex flex-col gap-2 mb-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{p.label}</label>
            <div className="flex gap-2">
              <input
                type={showKeys[p.id] ? 'text' : 'password'}
                value={config.proveedores[p.id]?.apiKey || ''}
                onChange={e => handleApiKey(p.id, e.target.value)}
                placeholder="sk-..."
                className="flex-1 input-field font-mono text-xs"
              />
              <button
                onClick={() => toggleShow(p.id)}
                className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                {showKeys[p.id] ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
            {/* Per-provider test button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTestConnection(p.id)}
                disabled={testingProvider === p.id || !config.proveedores[p.id]?.apiKey}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {testingProvider === p.id ? 'Probando...' : 'Probar conexion'}
              </button>
              {testResults[p.id] && (
                <span className={`text-xs font-semibold ${testResults[p.id].ok ? 'text-green-600' : 'text-red-500'}`}>
                  {testResults[p.id].ok ? `Conexion correcta` : testResults[p.id].message}
                </span>
              )}
            </div>
          </div>
        ))}
      </Section>

      <button onClick={handleSave} className="w-full py-3 bg-primary text-white rounded-xl font-semibold">
        Guardar configuracion
      </button>
    </div>
  )
}

// ------- Tab Km -------
function TabKm({ toast }) {
  const [config, setConfig] = useState(getConfigKm)

  const handleSave = () => {
    setConfigKm(config)
    toast.success('Precio por km guardado')
  }

  return (
    <div className="flex flex-col gap-4">
      <Section title="Precio por kilómetro">
        <FormField label="€ por km">
          <input
            type="number"
            step="0.01"
            min="0"
            value={config.precioPorKm}
            onChange={e => setConfig(c => ({ ...c, precioPorKm: parseFloat(e.target.value) || 0 }))}
            className="input-field"
          />
        </FormField>
        <p className="text-xs text-gray-400 mt-1">
          El precio oficial de la AEAT para 2024 es de 0,26 €/km
        </p>
      </Section>

      <button onClick={handleSave} className="w-full py-3 bg-primary text-white rounded-xl font-semibold">
        Guardar
      </button>
    </div>
  )
}

// ------- Tab Categorias -------
function TabCategorias({ toast }) {
  const {
    categorias,
    addCategoria,
    updateCategoria,
    removeCategoria,
    archiveCategoria,
    moveCategoria,
    addSubcategoria,
    updateSubcategoria,
    removeSubcategoria,
    archiveSubcategoria,
    moveSubcategoria,
    reset,
  } = useCategories()

  const [expanded, setExpanded] = useState({})
  const [editingCat, setEditingCat] = useState(null)
  const [editingSub, setEditingSub] = useState(null)
  const [newCatName, setNewCatName] = useState('')
  const [showAddCat, setShowAddCat] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  const handleAddCat = () => {
    if (!newCatName.trim()) return
    addCategoria({ id: uuidv4(), nombre: newCatName.trim(), subcategorias: [] })
    setNewCatName('')
    setShowAddCat(false)
    toast.success('Categoría añadida')
  }

  const handleRemoveCat = async (cat) => {
    // Check if any gastos use this category
    try {
      const gastos = await getAllGastos()
      const hasGastos = gastos.some(g => g.categoriaId === cat.id)
      if (hasGastos) {
        archiveCategoria(cat.id)
        toast.success('Categoría archivada (tiene gastos asociados)')
      } else {
        removeCategoria(cat.id)
        toast.success('Categoría eliminada')
      }
    } catch {
      removeCategoria(cat.id)
      toast.success('Categoría eliminada')
    }
  }

  const handleReset = () => {
    if (confirmReset) {
      reset(categorias)
      setConfirmReset(false)
      toast.success('Categorías predefinidas añadidas')
    } else {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 5000)
    }
  }

  // Filter out archived categories from the list display
  const visibleCats = categorias.filter(c => !c.archivada)

  return (
    <div className="flex flex-col gap-4">
      {/* Category list */}
      <div className="flex flex-col gap-2">
        {visibleCats.map((cat, catIdx) => (
          <div key={cat.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center px-3 py-2.5">
              {/* Reorder buttons */}
              <div className="flex flex-col mr-1">
                <button
                  onClick={() => moveCategoria(cat.id, 'up')}
                  disabled={catIdx === 0}
                  className="w-5 h-4 text-gray-300 hover:text-gray-500 disabled:opacity-20 flex items-center justify-center"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => moveCategoria(cat.id, 'down')}
                  disabled={catIdx === visibleCats.length - 1}
                  className="w-5 h-4 text-gray-300 hover:text-gray-500 disabled:opacity-20 flex items-center justify-center"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>

              <button
                onClick={() => toggleExpand(cat.id)}
                className="flex-1 flex items-center gap-2 text-left"
              >
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  className={`w-4 h-4 text-gray-400 transition-transform ${expanded[cat.id] ? 'rotate-90' : ''}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                {editingCat === cat.id ? (
                  <input
                    type="text"
                    defaultValue={cat.nombre}
                    autoFocus
                    onBlur={e => {
                      updateCategoria(cat.id, { nombre: e.target.value })
                      setEditingCat(null)
                    }}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 text-sm font-semibold border-b border-primary outline-none bg-transparent"
                  />
                ) : (
                  <span className="text-sm font-semibold text-gray-800">{cat.nombre}</span>
                )}
                <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {cat.subcategorias.filter(s => !s.archivada).length}
                </span>
              </button>
              <button
                onClick={() => setEditingCat(cat.id)}
                className="w-7 h-7 text-gray-400 hover:text-primary flex items-center justify-center ml-1"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              </button>
              <button
                onClick={() => handleRemoveCat(cat)}
                className="w-7 h-7 text-gray-400 hover:text-red-500 flex items-center justify-center"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>

            {expanded[cat.id] && (
              <div className="border-t border-gray-50 px-3 py-2 bg-gray-50">
                <div className="flex flex-col gap-1.5 mb-2">
                  {cat.subcategorias.filter(s => !s.archivada).map((sub, subIdx) => (
                    <SubcategoriaRow
                      key={sub.id}
                      categoriaId={cat.id}
                      sub={sub}
                      subIdx={subIdx}
                      totalSubs={cat.subcategorias.filter(s => !s.archivada).length}
                      editing={editingSub === `${cat.id}:${sub.id}`}
                      onEdit={() => setEditingSub(`${cat.id}:${sub.id}`)}
                      onDoneEdit={() => setEditingSub(null)}
                      onUpdate={(updates) => updateSubcategoria(cat.id, sub.id, updates)}
                      onDelete={async () => {
                        try {
                          const gastos = await getAllGastos()
                          const hasGastos = gastos.some(g => g.subcategoriaId === sub.id)
                          if (hasGastos) {
                            archiveSubcategoria(cat.id, sub.id)
                            toast.success('Subcategoría archivada (tiene gastos asociados)')
                          } else {
                            removeSubcategoria(cat.id, sub.id)
                            toast.success('Subcategoría eliminada')
                          }
                        } catch {
                          removeSubcategoria(cat.id, sub.id)
                          toast.success('Subcategoría eliminada')
                        }
                      }}
                      onMove={(dir) => moveSubcategoria(cat.id, sub.id, dir)}
                    />
                  ))}
                </div>
                <AddSubcategoriaRow onAdd={(sub) => { addSubcategoria(cat.id, sub); toast.success('Subcategoría añadida') }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add category */}
      {showAddCat ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            placeholder="Nombre de la categoría"
            className="flex-1 input-field"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddCat()
              if (e.key === 'Escape') { setShowAddCat(false); setNewCatName('') }
            }}
          />
          <button onClick={handleAddCat} className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold">
            Añadir
          </button>
          <button
            onClick={() => { setShowAddCat(false); setNewCatName('') }}
            className="px-3 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddCat(true)}
          className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors font-medium"
        >
          + Añadir categoría
        </button>
      )}

      {/* Reset / Merge defaults */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
        <p className="text-xs text-amber-700 mb-2">
          Añade las categorías predefinidas sin borrar las existentes.
        </p>
        {confirmReset ? (
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold"
            >
              Sí, añadir predefinidas
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={handleReset}
            className="w-full py-2.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-semibold text-sm hover:bg-amber-200 transition-colors"
          >
            Restaurar categorías predefinidas
          </button>
        )}
      </div>
    </div>
  )
}

function SubcategoriaRow({ categoriaId, sub, subIdx, totalSubs, editing, onEdit, onDoneEdit, onUpdate, onDelete, onMove }) {
  const [localSub, setLocalSub] = useState(sub)

  // Sync localSub when sub prop changes (e.g. after save)
  const prevSubId = localSub.id
  if (prevSubId !== sub.id) {
    setLocalSub(sub)
  }

  if (editing) {
    return (
      <div className="bg-white rounded-lg p-3 flex flex-col gap-2 text-xs border border-primary/20">
        <div className="flex gap-2">
          <input
            type="text"
            value={localSub.nombre}
            onChange={e => setLocalSub(s => ({ ...s, nombre: e.target.value }))}
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
            placeholder="Nombre"
            autoFocus
          />
          <input
            type="number"
            value={localSub.limite ?? ''}
            onChange={e => setLocalSub(s => ({ ...s, limite: e.target.value ? parseFloat(e.target.value) : null }))}
            className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
            placeholder="Límite €"
            min="0"
            step="0.01"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!localSub.tieneTicket}
              disabled={!!localSub.esKilometraje}
              onChange={e => setLocalSub(s => ({ ...s, tieneTicket: e.target.checked }))}
              className="w-3.5 h-3.5"
            />
            <span className={localSub.esKilometraje ? 'text-gray-300' : ''}>Ticket</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!localSub.esKilometraje}
              onChange={e => setLocalSub(s => ({
                ...s,
                esKilometraje: e.target.checked,
                tieneTicket: e.target.checked ? false : s.tieneTicket,
                tieneComensales: e.target.checked ? false : s.tieneComensales,
              }))}
              className="w-3.5 h-3.5"
            />
            <span>Kilometraje</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!localSub.tieneComensales}
              disabled={!!localSub.esKilometraje}
              onChange={e => setLocalSub(s => ({ ...s, tieneComensales: e.target.checked }))}
              className="w-3.5 h-3.5"
            />
            <span className={localSub.esKilometraje ? 'text-gray-300' : ''}>Comensales</span>
          </label>
        </div>
        <div>
          <select
            value={localSub.seccionPDF || 'varios'}
            onChange={e => setLocalSub(s => ({ ...s, seccionPDF: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white"
          >
            {SECCIONES_PDF.map(sec => (
              <option key={sec.value} value={sec.value}>{sec.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { onUpdate(localSub); onDoneEdit() }}
            className="flex-1 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold"
          >
            Guardar
          </button>
          <button onClick={onDoneEdit} className="flex-1 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-2">
      {/* Reorder */}
      <div className="flex flex-col mr-0.5">
        <button
          onClick={() => onMove('up')}
          disabled={subIdx === 0}
          className="w-4 h-3.5 text-gray-300 hover:text-gray-500 disabled:opacity-20 flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-2.5 h-2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
        <button
          onClick={() => onMove('down')}
          disabled={subIdx === totalSubs - 1}
          className="w-4 h-3.5 text-gray-300 hover:text-gray-500 disabled:opacity-20 flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-2.5 h-2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      <span className="flex-1 text-xs text-gray-700">{sub.nombre}</span>

      {/* Badges */}
      <div className="flex items-center gap-1 mr-1">
        {sub.limite != null && (
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            ≤ {sub.limite}€
          </span>
        )}
        {sub.esKilometraje && (
          <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">km</span>
        )}
        {sub.tieneComensales && (
          <span className="text-xs text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">com.</span>
        )}
      </div>

      <button onClick={onEdit} className="w-6 h-6 text-gray-400 hover:text-primary flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
        </svg>
      </button>
      <button onClick={onDelete} className="w-6 h-6 text-gray-400 hover:text-red-500 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function AddSubcategoriaRow({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [localSub, setLocalSub] = useState({
    nombre: '',
    limite: null,
    tieneTicket: true,
    esKilometraje: false,
    tieneComensales: false,
    seccionPDF: 'varios',
  })

  const handleAdd = () => {
    if (!localSub.nombre.trim()) return
    onAdd({ id: uuidv4(), ...localSub, nombre: localSub.nombre.trim() })
    setLocalSub({ nombre: '', limite: null, tieneTicket: true, esKilometraje: false, tieneComensales: false, seccionPDF: 'varios' })
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-1.5 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-primary hover:text-primary transition-colors"
      >
        + Añadir subcategoría
      </button>
    )
  }

  return (
    <div className="bg-white rounded-lg p-3 flex flex-col gap-2 text-xs border border-primary/20 mt-1">
      <div className="flex gap-2">
        <input
          type="text"
          value={localSub.nombre}
          onChange={e => setLocalSub(s => ({ ...s, nombre: e.target.value }))}
          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
          placeholder="Nombre *"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <input
          type="number"
          value={localSub.limite ?? ''}
          onChange={e => setLocalSub(s => ({ ...s, limite: e.target.value ? parseFloat(e.target.value) : null }))}
          className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
          placeholder="Límite €"
          min="0"
          step="0.01"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!localSub.tieneTicket}
            disabled={!!localSub.esKilometraje}
            onChange={e => setLocalSub(s => ({ ...s, tieneTicket: e.target.checked }))}
            className="w-3.5 h-3.5"
          />
          <span className={localSub.esKilometraje ? 'text-gray-300' : ''}>Ticket</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!localSub.esKilometraje}
            onChange={e => setLocalSub(s => ({
              ...s,
              esKilometraje: e.target.checked,
              tieneTicket: e.target.checked ? false : s.tieneTicket,
              tieneComensales: e.target.checked ? false : s.tieneComensales,
            }))}
            className="w-3.5 h-3.5"
          />
          <span>Kilometraje</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!localSub.tieneComensales}
            disabled={!!localSub.esKilometraje}
            onChange={e => setLocalSub(s => ({ ...s, tieneComensales: e.target.checked }))}
            className="w-3.5 h-3.5"
          />
          <span className={localSub.esKilometraje ? 'text-gray-300' : ''}>Comensales</span>
        </label>
      </div>
      <select
        value={localSub.seccionPDF || 'varios'}
        onChange={e => setLocalSub(s => ({ ...s, seccionPDF: e.target.value }))}
        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white"
      >
        {SECCIONES_PDF.map(sec => (
          <option key={sec.value} value={sec.value}>{sec.label}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <button onClick={handleAdd} className="flex-1 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold">
          Añadir
        </button>
        <button
          onClick={() => { setOpen(false); setLocalSub({ nombre: '', limite: null, tieneTicket: true, esKilometraje: false, tieneComensales: false, seccionPDF: 'varios' }) }}
          className="flex-1 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ------- Tab Datos -------
function TabDatos({ toast }) {
  const importRef = useRef(null)

  const handleExport = async () => {
    try {
      const data = await exportAllData()
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `maradona-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Datos exportados')
    } catch (err) {
      toast.error('Error al exportar')
      console.error(err)
    }
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        await importData(data)
        toast.success('Datos importados correctamente')
      } catch (err) {
        toast.error('Error al importar: formato inválido')
        console.error(err)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-4">
      <Section title="Exportar datos">
        <p className="text-sm text-gray-500 mb-3">
          Exporta todos tus gastos como archivo JSON para hacer una copia de seguridad.
        </p>
        <button
          onClick={handleExport}
          className="w-full py-3 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Exportar JSON
        </button>
      </Section>

      <Section title="Importar datos">
        <p className="text-sm text-gray-500 mb-3">
          Importa gastos desde un archivo JSON exportado anteriormente.
        </p>
        <button
          onClick={() => importRef.current?.click()}
          className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Importar JSON
        </button>
        <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </Section>
    </div>
  )
}

// ------- Helpers -------
function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">{title}</h3>
      {children}
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
