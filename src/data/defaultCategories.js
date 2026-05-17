export const defaultCategories = [
  {
    id: "locomocion",
    nombre: "Medios de Locomoción",
    fija: true,
    subcategorias: [
      { id: "taxi",     nombre: "Taxi",     limite: 50,   tieneTicket: true,  esKilometraje: false, tieneComensales: false, esNormal: false, seccionPDF: "locomocion" },
      { id: "tren",     nombre: "Tren",     limite: 200,  tieneTicket: true,  esKilometraje: false, tieneComensales: false, esNormal: false, seccionPDF: "locomocion" },
      { id: "avion",    nombre: "Avión",    limite: null, tieneTicket: true,  esKilometraje: false, tieneComensales: false, esNormal: false, seccionPDF: "locomocion" },
      { id: "gasolina", nombre: "Gasolina", limite: null, tieneTicket: true,  esKilometraje: false, tieneComensales: false, esNormal: false, seccionPDF: "locomocion" }
    ]
  },
  {
    id: "restaurantes",
    nombre: "Restaurantes",
    fija: true,
    subcategorias: [
      { id: "desayuno", nombre: "Desayuno", limite: 10, tieneTicket: true, esKilometraje: false, tieneComensales: true, esNormal: false, seccionPDF: "restaurantes" },
      { id: "comida",   nombre: "Comida",   limite: 25, tieneTicket: true, esKilometraje: false, tieneComensales: true, esNormal: false, seccionPDF: "restaurantes" },
      { id: "cena",     nombre: "Cena",     limite: 35, tieneTicket: true, esKilometraje: false, tieneComensales: true, esNormal: false, seccionPDF: "restaurantes" }
    ]
  },
  {
    id: "hoteles",
    nombre: "Hoteles",
    fija: true,
    subcategorias: [
      { id: "hotel", nombre: "Hotel", limite: 150, tieneTicket: true, esKilometraje: false, tieneComensales: false, esNormal: false, seccionPDF: "hoteles" }
    ]
  },
  {
    id: "invitaciones",
    nombre: "Invitaciones",
    fija: true,
    subcategorias: [
      { id: "restaurante", nombre: "Restaurante", limite: 100, tieneTicket: true, esKilometraje: false, tieneComensales: true,  esNormal: false, seccionPDF: "invitaciones" },
      { id: "invitacion",  nombre: "Invitación",  limite: 150, tieneTicket: true, esKilometraje: false, tieneComensales: true,  esNormal: false, seccionPDF: "invitaciones" }
    ]
  },
  {
    id: "varios",
    nombre: "Varios",
    fija: true,
    subcategorias: [
      { id: "material_oficina", nombre: "Material de Oficina",  limite: null, tieneTicket: true, esKilometraje: false, tieneComensales: false, esNormal: false, seccionPDF: "varios" },
      { id: "curso",            nombre: "Curso / Inscripción",  limite: null, tieneTicket: true, esKilometraje: false, tieneComensales: false, esNormal: false, seccionPDF: "varios" },
      { id: "otros_gastos",     nombre: "Otros gastos",         limite: null, tieneTicket: true, esKilometraje: false, tieneComensales: false, esNormal: false, seccionPDF: "varios" }
    ]
  },
  {
    id: "compensaciones_km",
    nombre: "Compensaciones Kilométricas",
    fija: true,
    subcategorias: [
      { id: "kilometraje", nombre: "Kilometraje", limite: null, tieneTicket: false, esKilometraje: true, tieneComensales: false, esNormal: false, seccionPDF: "kilometraje" }
    ]
  }
]
