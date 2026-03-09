const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  // === Authentication ===
  nombre: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  contrasena: {
    type: String,
    required: true,
    minlength: 6,
  },
  rol: {
    type: String,
    enum: ['electricista', 'administrador'],
    default: 'electricista',
  },
  activo: {
    type: Boolean,
    default: true,
  },

  // === Profile data ===
  apellidos: { type: String, default: '' },
  empresa: { type: String, default: '' },
  direccion: { type: String, default: '' },
  codigoPostal: { type: String, default: '' },
  ciudad: { type: String, default: '' },
  provincia: { type: String, default: '' },
  pais: { type: String, default: '' },
  telefono: { type: String, default: '' },
  mobiel: { type: String, default: '' },
  email2: { type: String, default: '' },
  huisnummer: { type: String, default: '' },
  iban: { type: String, default: '' },
  nif: { type: String, default: '' },
  web: { type: String, default: '' },
  logo: { type: String, default: '' }, // base64 logo image uploaded by the electrician
  profileCompleted: { type: Boolean, default: false },

  // === Commission rates (set by admin per electrician) ===
  comisionHardware: { type: Number, default: 0, min: 0, max: 100 },
  comisionHorasTrabajo: { type: Number, default: 0, min: 0, max: 100 },
  comisionTransporte: { type: Number, default: 0, min: 0, max: 100 },
  comisionEspecial: { type: Number, default: 0, min: 0, max: 100 },

  // === Project counter (for auto-title) ===
  contadorObras: { type: Number, default: 0 },

  // === Stats ===
  totalContratosCompletados: { type: Number, default: 0 },

  fechaRegistro: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('contrasena')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.contrasena = await bcrypt.hash(this.contrasena, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare passwords
UserSchema.methods.compararContrasena = async function (contrasena) {
  return bcrypt.compare(contrasena, this.contrasena);
};

// Generate auto project title: firstName + first 3 chars of lastName + "-" + padded counter
UserSchema.methods.generarTituloObra = function () {
  const nombre = (this.nombre || '').toLowerCase().replace(/\s+/g, '');
  const apellido = (this.apellidos || '').toLowerCase().replace(/\s+/g, '').substring(0, 3);
  const numero = String(this.contadorObras + 1).padStart(3, '0');
  return `${nombre}${apellido}-${numero}`;
};

module.exports = mongoose.model('User', UserSchema);
