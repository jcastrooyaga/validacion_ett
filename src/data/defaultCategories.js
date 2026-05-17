export const defaultCategories = [
  {
    id: "desplazamientos",
    nombre: "Desplazamientos",
    subcategorias: [
      { id: "taxi", nombre: "Taxi", limite: 50, tieneTicket: true, esKilometraje: false, tieneComensales: false, esNormal: false, seccionPDF: "locomocion" },
      { id: "tren", nombre: "Tren", limite: 200, tieneTicket: true, esKilometraje: false, tieneComensales: false, esNormal: false, seccionPDF: "locomocion" },
      { id: "avion", nombre: "Avión", limite: null, tieneTicket: true, esKilometraje: false, tieneComensales: false, esNormal: false, seccionPDF: "locomocion" },
      { id: "gasolina", nombre: "Gasolina", limite: null, tieneTicket: true, esKilometraje: false, tieneComensales: false, esNormal: false, seccionPDF: "locomocion" },
      { id: "kilometraje", nombre: "Kilometraje", limite: null, tieneTicket: false, esKilometraje: true, tieneComensales: false, esNormal: false, seccionPDF: "kilometraje" }
    ]
  },
  {
    id: "manutencion",
    nombre: "Restaurantes",
    subcategorias: [
      { id: "desayuno", nombre: "Desayuno", limite: 10, tieneTicket: true, esKilometraje: false, tieneComensales: true, esNormal: false, seccionPDF: "varios" },
      { id: "comida", nombre: "Comida", limite: 25, tieneTicket: true, esKilometraje: false, tieneComensales: true, esNormal: false, seccionPDF: "varios" },
      { id: "cena", nombre: "Cena", limite: 35, tieneTicket: true, esKilometraje: false, tieneComensales: true, esNormal: false, seccionPDF: "varios" }
    ]
  },
  {
    id: "representacion",
    nombre: "Representación",
    subcategorias: [
      { id: "restaurante", nombre: "Restaurante", limite: 100, tieneTicket: true, esKilometraje: false, tieneComensales: true, esNormal: false, seccionPDF: "restaurantes" },
      { id: "invitacion", nombre: "Invitación", limite: 150, tieneTicket: true, esKilometraje: false, tieneComensales: true, esNormal: false, seccionPDF: "invitaciones" }
    ]
  },
  {
    id: "alojamiento",
    nombre: "Alojamiento",
    subcategorias: [
      { id: "hotel", nombre: "Hotel", limite: 150, tieneTicket: true, esKilometraje: false, tieneComensales: false, esNormal: false, seccionPDF: "hoteles" }
    ]
  },
  {
    id: "material",
    nombre: "Material de Oficina",
    subcategorias: [
      { id: "material_oficina", nombre: "Material", limite: null, tieneTicket: true, esKilometraje: false, tieneComensales: false, esNormal: false, seccionPDF: "varios" }
    ]
  },
  {
    id: "formacion",
    nombre: "Formación",
    subcategorias: [
      { id: "curso", nombre: "Curso / Inscripción", limite: null, tieneTicket: true, esKilometraje: false, tieneComensales: false, esNormal: false, seccionPDF: "varios" }
    ]
  },
  {
    id: "otros",
    nombre: "Otros",
    subcategorias: [
      { id: "otros_gastos", nombre: "Otros gastos", limite: null, tieneTicket: true, esKilometraje: false, tieneComensales: false, esNormal: false, seccionPDF: "varios" }
    ]
  }
]
