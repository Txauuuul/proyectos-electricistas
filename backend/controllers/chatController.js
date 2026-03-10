const ChatMessage = require('../models/Chat');
const Project = require('../models/Project');
const { crearNotificacion } = require('./notificationController');

// GET /api/chat/:proyectoId — Get all messages for a project
const obtenerMensajes = async (req, res) => {
  try {
    const { proyectoId } = req.params;

    // Verify user has access to the project
    const proyecto = await Project.findById(proyectoId);
    if (!proyecto) return res.status(404).json({ error: 'Project not found' });

    if (req.usuario.rol !== 'administrador' && proyecto.usuarioId.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const mensajes = await ChatMessage.find({ proyectoId })
      .sort({ fechaCreacion: 1 })
      .limit(200);

    // Mark messages from the other party as read
    await ChatMessage.updateMany(
      { proyectoId, autorId: { $ne: req.usuario.id }, leido: false },
      { $set: { leido: true } }
    );

    res.json(mensajes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/chat/:proyectoId — Send a message
const enviarMensaje = async (req, res) => {
  try {
    const { proyectoId } = req.params;
    const { mensaje } = req.body;

    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const proyecto = await Project.findById(proyectoId).populate('usuarioId', 'nombre');
    if (!proyecto) return res.status(404).json({ error: 'Project not found' });

    if (req.usuario.rol !== 'administrador' && proyecto.usuarioId._id.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fallback: si el JWT antiguo no tiene nombre, lo buscamos en BD
    let nombreAutor = req.usuario.nombre;
    if (!nombreAutor) {
      const User = require('../models/User');
      const userDoc = await User.findById(req.usuario.id).select('nombre');
      nombreAutor = userDoc?.nombre || 'Unknown';
    }

    const nuevoMensaje = new ChatMessage({
      proyectoId,
      autorId: req.usuario.id,
      rolAutor: req.usuario.rol,
      nombreAutor,
      mensaje: mensaje.trim().slice(0, 2000),
    });

    await nuevoMensaje.save();

    // Notify the other party
    try {
      if (req.usuario.rol === 'administrador') {
        // Notify the electrician
        await crearNotificacion({
          usuarioId: proyecto.usuarioId._id,
          tipo: 'chat_message',
          titulo: 'New message from admin',
          mensaje: `Admin sent a message about project ${proyecto.tituloAutomatico || proyecto.nombreCasa}`,
          proyectoId: proyecto._id,
        });
      } else {
        // Notify all admins
        const User = require('../models/User');
        const admins = await User.find({ rol: 'administrador', activo: true }).select('_id');
        for (const admin of admins) {
          await crearNotificacion({
            usuarioId: admin._id,
            tipo: 'chat_message',
            titulo: 'New message from electrician',
            mensaje: `${req.usuario.nombre} sent a message about project ${proyecto.tituloAutomatico || proyecto.nombreCasa}`,
            proyectoId: proyecto._id,
          });
        }
      }
    } catch (notifErr) {
      console.warn('Chat notification failed (non-blocking):', notifErr.message);
    }

    res.status(201).json(nuevoMensaje);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/chat/:proyectoId/unread — Count of unread messages for the current user
const contarNoLeidos = async (req, res) => {
  try {
    const { proyectoId } = req.params;
    const count = await ChatMessage.countDocuments({
      proyectoId,
      autorId: { $ne: req.usuario.id },
      leido: false,
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { obtenerMensajes, enviarMensaje, contarNoLeidos };
