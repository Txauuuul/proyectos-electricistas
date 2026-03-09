const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  proyectoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },
  autorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rolAutor: {
    type: String,
    enum: ['electricista', 'administrador'],
    required: true,
  },
  nombreAutor: {
    type: String,
    required: true,
  },
  mensaje: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  leido: {
    type: Boolean,
    default: false,
  },
  fechaCreacion: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
