const User = require('../models/User');
const bcrypt = require('bcryptjs');

// GET /api/profile — Get current user's profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.usuario.id).select('-contrasena');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/profile — Update current user's profile
const updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'nombre', 'apellidos', 'empresa', 'direccion', 'codigoPostal',
      'ciudad', 'provincia', 'pais', 'telefono', 'mobiel', 'email2',
      'huisnummer', 'iban', 'nif', 'web', 'logo',
    ];

    const user = await User.findById(req.usuario.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    // Mark profile as completed if key fields are filled
    if (user.nombre && user.apellidos && user.direccion && user.telefono) {
      user.profileCompleted = true;
    }

    await user.save();

    const userObj = user.toObject();
    delete userObj.contrasena;
    
    console.log('✅ Profile updated for user:', req.usuario.id);
    res.json(userObj);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/profile/:id — Admin: get any user's profile
const getProfileById = async (req, res) => {
  try {
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const user = await User.findById(req.params.id).select('-contrasena');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/profile/:id — Admin: update any user's profile (commissions etc.)
const updateProfileById = async (req, res) => {
  try {
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const allowedFields = [
      'nombre', 'apellidos', 'empresa', 'direccion', 'codigoPostal',
      'ciudad', 'provincia', 'pais', 'telefono', 'mobiel', 'email2',
      'huisnummer', 'iban', 'nif', 'web',
      'comisionHardware', 'comisionHorasTrabajo', 'comisionTransporte',
      'comisionEspecial', 'activo', 'logo',
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    const userObj = user.toObject();
    delete userObj.contrasena;
    res.json(userObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/profile/all/electricistas — Admin: list all electricians
const getAllElectricistas = async (req, res) => {
  try {
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const users = await User.find({ rol: 'electricista' })
      .select('-contrasena')
      .sort({ fechaRegistro: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/profile/change-password — Electrician changes own password
const changePassword = async (req, res) => {
  try {
    const { contrasenaActual, nuevaContrasena } = req.body;
    if (!contrasenaActual || !nuevaContrasena) {
      return res.status(400).json({ error: 'Both current and new password are required' });
    }
    if (nuevaContrasena.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    const user = await User.findById(req.usuario.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(contrasenaActual, user.contrasena);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    user.contrasena = await bcrypt.hash(nuevaContrasena, 10);
    await user.save();
    res.json({ mensaje: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getProfileById,
  updateProfileById,
  getAllElectricistas,
  changePassword,
};
