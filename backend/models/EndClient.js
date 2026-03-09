const mongoose = require('mongoose');

const EndClientSchema = new mongoose.Schema({
  // The electrician who owns this client
  electricistaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Client details
  nombre: { type: String, required: true },
  apellidos: { type: String, default: '' },
  empresa: { type: String, default: '' },
  direccion: { type: String, default: '' },
  codigoPostal: { type: String, default: '' },
  ciudad: { type: String, default: '' },
  telefono: { type: String, default: '' },
  email: { type: String, default: '' },
  notas: { type: String, default: '' },

  fechaCreacion: { type: Date, default: Date.now },
});

module.exports = mongoose.model('EndClient', EndClientSchema);
