const cron = require('node-cron');
const Project = require('../models/Project');
const User = require('../models/User');
const emailService = require('./emailService');
const { crearNotificacion } = require('../controllers/notificationController');

/**
 * Runs every day at 08:00 AM server time.
 * Checks for projects needing follow-up actions and sends reminders.
 */
const iniciarRecordatorios = () => {
  console.log('⏰ Reminder service initialized');

  // Run every day at 08:00
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Running daily reminder check...');
    try {
      await checkOfertasSinRespuesta();
      await checkProyectosDetenidos();
      await checkPagoPendiente();
    } catch (err) {
      console.error('❌ Reminder service error:', err.message);
    }
  });
};

// ── 1. Offers sent > 3 days with no client response ─────────────
const checkOfertasSinRespuesta = async () => {
  const hace3Dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Offers sent between 3 and 7 days ago (to avoid spam)
  const proyectos = await Project.find({
    estado: 'offer_sent',
    'oferta.fechaEnvioOferta': { $lt: hace3Dias, $gt: hace7Dias },
  }).populate('usuarioId', 'nombre email');

  for (const proyecto of proyectos) {
    const electricista = proyecto.usuarioId;
    const diasSinRespuesta = Math.floor(
      (Date.now() - new Date(proyecto.oferta.fechaEnvioOferta)) / (1000 * 60 * 60 * 24)
    );

    console.log(`📧 Reminder: project ${proyecto.tituloAutomatico} - ${diasSinRespuesta} days without client response`);

    // Email to the electrician (client)
    try {
      await emailService.sendReminderOfertaSinRespuesta(proyecto, electricista, diasSinRespuesta);
    } catch (e) {
      console.warn('Email reminder failed:', e.message);
    }

    // In-app notification to admins
    const admins = await User.find({ rol: 'administrador', activo: true }).select('_id');
    for (const admin of admins) {
      await crearNotificacion({
        usuarioId: admin._id,
        tipo: 'reminder',
        titulo: '⏰ Offer without response',
        mensaje: `Project ${proyecto.tituloAutomatico || proyecto.nombreCasa} (${electricista?.nombre}) has been waiting for client signature for ${diasSinRespuesta} days`,
        proyectoId: proyecto._id,
      });
    }
  }

  if (proyectos.length > 0) {
    console.log(`✅ Sent ${proyectos.length} offer-reminder notification(s)`);
  }
};

// ── 2. Projects in "working" with no activity for > 14 days ─────
const checkProyectosDetenidos = async () => {
  const hace14Dias = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const hace21Dias = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);

  const proyectos = await Project.find({
    estado: 'working',
    fechaUltimaActividad: { $lt: hace14Dias, $gt: hace21Dias },
  }).populate('usuarioId', 'nombre email');

  for (const proyecto of proyectos) {
    const dias = Math.floor(
      (Date.now() - new Date(proyecto.fechaUltimaActividad)) / (1000 * 60 * 60 * 24)
    );

    console.log(`⚠️ Stalled project: ${proyecto.tituloAutomatico} - ${dias} days without activity`);

    const admins = await User.find({ rol: 'administrador', activo: true }).select('_id');
    for (const admin of admins) {
      await crearNotificacion({
        usuarioId: admin._id,
        tipo: 'reminder',
        titulo: '⚠️ Stalled project',
        mensaje: `Project ${proyecto.tituloAutomatico || proyecto.nombreCasa} has had no activity for ${dias} days (status: Working)`,
        proyectoId: proyecto._id,
      });
    }
  }

  if (proyectos.length > 0) {
    console.log(`✅ Sent ${proyectos.length} stalled-project alert(s)`);
  }
};

// ── 3. Projects pending payment for > 7 days ────────────────────
const checkPagoPendiente = async () => {
  const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const hace14Dias = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const proyectos = await Project.find({
    estado: 'pending_payment',
    fechaActualizacion: { $lt: hace7Dias, $gt: hace14Dias },
  }).populate('usuarioId', 'nombre email');

  for (const proyecto of proyectos) {
    const dias = Math.floor(
      (Date.now() - new Date(proyecto.fechaActualizacion)) / (1000 * 60 * 60 * 24)
    );

    console.log(`💰 Overdue payment: ${proyecto.tituloAutomatico} - ${dias} days pending`);

    const admins = await User.find({ rol: 'administrador', activo: true }).select('_id');
    for (const admin of admins) {
      await crearNotificacion({
        usuarioId: admin._id,
        tipo: 'reminder',
        titulo: '💰 Payment overdue',
        mensaje: `Project ${proyecto.tituloAutomatico || proyecto.nombreCasa} (${proyecto.usuarioId?.nombre}) has been pending payment for ${dias} days. Amount: €${(proyecto.oferta?.precioTotal || 0).toFixed(2)}`,
        proyectoId: proyecto._id,
      });
    }
  }

  if (proyectos.length > 0) {
    console.log(`✅ Sent ${proyectos.length} payment-reminder(s)`);
  }
};

module.exports = { iniciarRecordatorios };
