const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // Who receives the notification
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Notification type
  tipo: {
    type: String,
    enum: [
      'new_project',        // A new project was created
      'offer_sent',         // An offer was sent to the electrician
      'oferta_enviada',     // Offer sent (Spanish variant)
      'contract_signed',    // Contract was signed
      'contrato_firmado',   // Contract signed (Spanish variant)
      'project_finished',   // Project marked as finished
      'proyecto_finalizado',// Project finished (Spanish variant)
      'payment_received',   // Payment confirmed
      'additional_info',    // Electrician added additional info
      'reopen',             // Project was reopened
      'state_change',       // State changed
      'offer_rejected',     // Offer was rejected
      'oferta_rechazada',   // Offer rejected (Spanish variant)
      'cambios_propuestos', // Client submitted a change proposal
    ],
    required: true,
  },

  titulo: { type: String, required: true },
  mensaje: { type: String, default: '' },
  leida: { type: Boolean, default: false },

  // Optional reference to project
  proyectoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
  },

  fechaCreacion: { type: Date, default: Date.now },
});

// Index for fast queries
NotificationSchema.index({ usuarioId: 1, leida: 1, fechaCreacion: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
