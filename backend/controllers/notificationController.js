const Notification = require('../models/Notification');

// GET /api/notificaciones — Get current user's notifications
const obtenerNotificaciones = async (req, res) => {
  try {
    const notificaciones = await Notification.find({ usuarioId: req.usuario.id })
      .sort({ fechaCreacion: -1 })
      .limit(50)
      .populate('proyectoId', 'tituloAutomatico tituloPersonalizado nombreCasa');
    res.json(notificaciones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/notificaciones/no-leidas — Count unread
const contarNoLeidas = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ usuarioId: req.usuario.id, leida: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/notificaciones/:id/leer — Mark one as read
const marcarLeida = async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ error: 'Not found' });
    if (notif.usuarioId.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    notif.leida = true;
    await notif.save();
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/notificaciones/leer-todas — Mark all as read
const marcarTodasLeidas = async (req, res) => {
  try {
    await Notification.updateMany(
      { usuarioId: req.usuario.id, leida: false },
      { leida: true }
    );
    res.json({ mensaje: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper: create notification for a user (used by other controllers)
const crearNotificacion = async ({ usuarioId, tipo, titulo, mensaje, proyectoId }) => {
  try {
    const notif = new Notification({ usuarioId, tipo, titulo, mensaje, proyectoId });
    await notif.save();
    return notif;
  } catch (err) {
    console.warn('Failed to create notification:', err.message);
  }
};

// Helper: notify all admins
const notificarAdmins = async ({ tipo, titulo, mensaje, proyectoId }) => {
  const User = require('../models/User');
  try {
    const admins = await User.find({ rol: 'administrador' });
    for (const admin of admins) {
      await crearNotificacion({ usuarioId: admin._id, tipo, titulo, mensaje, proyectoId });
    }
  } catch (err) {
    console.warn('Failed to notify admins:', err.message);
  }
};

module.exports = {
  obtenerNotificaciones,
  contarNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
  crearNotificacion,
  notificarAdmins,
};
