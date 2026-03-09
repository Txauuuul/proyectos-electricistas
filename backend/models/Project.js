const mongoose = require('mongoose');

const MarkerSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['camara', 'wifi', 'arbol', 'otro'],
  },
  x: Number,
  y: Number,
  aspectRatio: Number,
  descripcion: String,
}, { _id: false });

const FloorPlanSchema = new mongoose.Schema({
  nombre: {
    type: String,
    default: 'Plano sin nombre',
  },
  imagenBase64: {
    type: String,
    required: true,
  },
  comentarios: String,
  marcadores: {
    type: [MarkerSchema],
    default: [],
  },
  dataDibujo: mongoose.Schema.Types.Mixed,
}, { _id: false });

// Schema for each "ruimte" (room/space) added in the wizard
const RuimteSchema = new mongoose.Schema({
  naam: { type: String, default: '' },
  omschrijving: { type: String, default: '' },
  platteGrond: { type: String, default: null }, // base64 of the floor plan (PDF converted to image)
  fotos: { type: [String], default: [] },        // base64 photos of the room
  marcadores: { type: mongoose.Schema.Types.Mixed, default: [] }, // marker icons placed on canvas
  dataDibujo: { type: mongoose.Schema.Types.Mixed, default: null }, // freehand drawing JSON (Fabric.js)
}, { _id: true });

// Schema for the commission result stored when admin finalizes a project
const CommissieResultaatSchema = new mongoose.Schema({
  offerteTotaalbedrag: { type: Number, default: 0 },
  type1Pct:  { type: Number, default: 0 }, type1Bedrag:  { type: Number, default: 0 }, type1Commissie:  { type: Number, default: 0 },
  type2Pct:  { type: Number, default: 0 }, type2Bedrag:  { type: Number, default: 0 }, type2Commissie:  { type: Number, default: 0 },
  type3Pct:  { type: Number, default: 0 }, type3Bedrag:  { type: Number, default: 0 }, type3Commissie:  { type: Number, default: 0 },
  type4Pct:  { type: Number, default: 0 }, type4Bedrag:  { type: Number, default: 0 }, type4Commissie:  { type: Number, default: 0 },
  type5Pct:  { type: Number, default: 0 }, type5Bedrag:  { type: Number, default: 0 }, type5Commissie:  { type: Number, default: 0 },
  totaleCommissie: { type: Number, default: 0 },
  datumAfgewerkt: { type: Date },
}, { _id: false });

// Schema for budget/quote line items
const BudgetItemSchema = new mongoose.Schema({
  descripcion: {
    type: String,
    required: true,
  },
  cantidad: {
    type: Number,
    default: 1,
  },
  precioUnitario: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
}, { _id: false });

// Schema for the company's offer/proposal
const OfertaSchema = new mongoose.Schema({
  // Modified floor plans with company proposals
  planosModificados: [FloorPlanSchema],
  
  // Budget breakdown
  presupuestoItems: {
    type: [BudgetItemSchema],
    default: [],
  },
  
  // Estimated budget (total cost of the work)
  presupuestoEstimado: {
    type: Number,
    default: 0,
  },
  
  // Final total price
  precioTotal: {
    type: Number,
    default: 0,
  },
  
  // Cost breakdown for commission calculation
  costeHardware: { type: Number, default: 0 },
  costeHorasTrabajo: { type: Number, default: 0 },
  costeTransporte: { type: Number, default: 0 },
  
  // Proposed installation start date
  fechaInicioInstalacion: {
    type: Date,
  },
  
  // Estimated duration (in days)
  duracionEstimadaDias: {
    type: Number,
  },
  
  // Additional notes from the company
  notasEmpresa: {
    type: String,
    default: '',
  },
  
  // Contract/proposal PDF uploaded by admin (base64)
  documentoPDF: {
    type: String,
  },
  
  // Client's signature (base64 PNG)
  firmaCliente: {
    type: String,
  },
  
  // Date when client signed
  fechaFirma: {
    type: Date,
  },
  
  // Contract acceptance checkboxes
  aceptaContrato: {
    type: Boolean,
    default: false,
  },
  haLeidoDocumentacion: {
    type: Boolean,
    default: false,
  },
  
  // Date when offer was created
  fechaCreacionOferta: {
    type: Date,
    default: Date.now,
  },
  
  // Date when offer was sent to client
  fechaEnvioOferta: {
    type: Date,
  },
  
  // Admin who created the offer
  creadaPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { _id: false });

// State history entry
const HistorialEstadoSchema = new mongoose.Schema({
  estadoAnterior: String,
  estadoNuevo: String,
  fecha: {
    type: Date,
    default: Date.now,
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  comentario: String,
}, { _id: false });

// Additional info submitted after contract signing
const InfoAdicionalSchema = new mongoose.Schema({
  texto: { type: String, default: '' },
  planos: [FloorPlanSchema],
  fotos: [String],
  fecha: { type: Date, default: Date.now },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { _id: true });

// Reopen/amendment schema — for changes after contract is signed
const ReaperturaSchema = new mongoose.Schema({
  descripcionCambios: { type: String, default: '' },
  presupuestoItems: { type: [BudgetItemSchema], default: [] },
  presupuestoAdicional: { type: Number, default: 0 },
  documentoPDF: { type: String },
  firmaCliente: { type: String },
  fechaFirma: { type: Date },
  aceptado: { type: Boolean, default: false },
  fechaCreacion: { type: Date, default: Date.now },
  creadaPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: true });

// Client change proposals schema — for clients to request changes
const PropuestaClienteSchema = new mongoose.Schema({
  demandas: { type: String, required: true }, // Text of requested changes
  fechaCreacion: { type: Date, default: Date.now },
}, { _id: true });

const ProjectSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // End client this project is for (electrician's customer)
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EndClient',
    default: null,
  },

  // Auto-generated title (e.g., "saulvid-001")
  tituloAutomatico: {
    type: String,
    default: '',
  },

  // Custom title given by electrician
  tituloPersonalizado: {
    type: String,
    default: '',
  },

  nombreCasa: {
    type: String,
    required: true,
  },
  direccion: {
    type: String,
    default: '',
  },
  // Address broken into parts
  straat: { type: String, default: '' },
  nr: { type: String, default: '' },
  postcode: { type: String, default: '' },
  stad: { type: String, default: '' },
  // Whether the offer goes directly to the end-client
  ofertaDirectaCliente: { type: Boolean, default: true },
  // Extra info about client/prospect/assignment
  extraInfo: { type: String, default: '' },
  fechaInicio: {
    type: Date,
    required: true,
  },
  planos: [FloorPlanSchema],
  // Rooms/spaces added in the wizard
  ruimtes: { type: [RuimteSchema], default: [] },
  fotosLocalizacion: [String],
  
  // Company offer/proposal
  oferta: {
    type: OfertaSchema,
    default: null,
  },

  // Additional info added after contract signing
  infoAdicional: {
    type: [InfoAdicionalSchema],
    default: [],
  },

  // Reopens/amendments after contract
  reaperturas: {
    type: [ReaperturaSchema],
    default: [],
  },

  // Client change proposals
  propuestasCliente: {
    type: [PropuestaClienteSchema],
    default: [],
  },
  
  // State history
  historialEstados: {
    type: [HistorialEstadoSchema],
    default: [],
  },
  
  estado: {
    type: String,
    enum: [
      'created',           // Electrician created the project
      'offer_ready',       // Admin prepared offer (not sent yet)
      'offer_sent',        // Offer sent to client
      'approved',          // Client approved and signed
      'working',           // Work in progress
      'finished',          // Work completed
      'pending_payment',   // Awaiting payment
      'paid',              // Payment received
      'rejected',          // Client rejected the offer
    ],
    default: 'created',
  },
  
  fechaCreacion: {
    type: Date,
    default: Date.now,
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now,
  },
  // Fecha de última actividad (se actualiza en cambios significativos: info adicional, reaperturas, etc.)
  fechaUltimaActividad: {
    type: Date,
    default: Date.now,
  },
  // Commission result saved when admin finalizes the project
  commissieResultaat: {
    type: CommissieResultaatSchema,
    default: null,
  },

  // Private internal notes — visible to admins only, never shown to electricians
  notasInternas: {
    type: String,
    default: '',
  },
});

module.exports = mongoose.model('Project', ProjectSchema);
