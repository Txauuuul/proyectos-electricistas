const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Password must be ≥8 chars, contain at least 1 uppercase and 1 digit
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

const registrar = async (req, res) => {
  try {
    const { nombre, email, contrasena, rol } = req.body;

    // Validate required fields
    if (!nombre || !email || !contrasena) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    // Validate password complexity
    if (!PASSWORD_REGEX.test(contrasena)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and include at least 1 uppercase letter and 1 number',
      });
    }

    // Validar que el usuario no exista
    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Crear usuario
    const usuario = new User({
      nombre,
      email,
      contrasena,
      rol: rol || 'electricista',
    });

    await usuario.save();

    // Generar token JWT
    const token = jwt.sign(
      { id: usuario._id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, contrasena } = req.body;

    // Validar credenciales
    const usuario = await User.findOne({ email });
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const contrasenaValida = await usuario.compararContrasena(contrasena);
    if (!contrasenaValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: usuario._id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { registrar, login };
