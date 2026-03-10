const Project = require('../models/Project');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { crearNotificacion, notificarAdmins } = require('./notificationController');

// Helper: change state and record history
const cambiarEstado = async (proyecto, nuevoEstado, usuarioId, comentario = '') => {
  const estadoAnterior = proyecto.estado;
  proyecto.estado = nuevoEstado;
  proyecto.historialEstados.push({
    estadoAnterior,
    estadoNuevo: nuevoEstado,
    fecha: new Date(),
    usuarioId,
    comentario,
  });
  proyecto.fechaActualizacion = Date.now();
  proyecto.fechaUltimaActividad = Date.now();
};

// ============================================================
// GET /api/proyectos/:id/oferta - Get offer details
// ============================================================
const obtenerOferta = async (req, res) => {
  try {
    const proyecto = await Project.findById(req.params.id)
      .populate('usuarioId', 'nombre email')
      .populate('oferta.creadaPor', 'nombre email');

    if (!proyecto) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Permission check: owner or admin
    if (req.usuario.rol !== 'administrador' && proyecto.usuarioId._id.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!proyecto.oferta) {
      return res.status(404).json({ error: 'No offer exists for this project' });
    }

    res.json({
      proyecto: {
        _id: proyecto._id,
        nombreCasa: proyecto.nombreCasa,
        direccion: proyecto.direccion,
        fechaInicio: proyecto.fechaInicio,
        estado: proyecto.estado,
        planos: proyecto.planos,
        fotosLocalizacion: proyecto.fotosLocalizacion,
        usuarioId: proyecto.usuarioId,
      },
      oferta: proyecto.oferta,
    });
  } catch (error) {
    console.error('Error getting offer:', error);
    res.status(500).json({ error: error.message });
  }
};

// (Discount endpoint removed — discount system no longer in use)

// ============================================================
// POST /api/proyectos/:id/oferta - Create/update offer (admin only)
// ============================================================
const crearOferta = async (req, res) => {
  try {
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Only administrators can create offers' });
    }

    const proyecto = await Project.findById(req.params.id);
    if (!proyecto) return res.status(404).json({ error: 'Project not found' });

    // Admin can save/update the offer draft from any state
    // (no state restriction — saving a draft should always be allowed)

    const {
      planosModificados,
      presupuestoItems,
      presupuestoEstimado,
      precioTotal,
      precioTotalEstimado,
      costeHardware,
      costeHorasTrabajo,
      costeTransporte,
      fechaInicioInstalacion,
      duracionEstimadaDias,
      notasEmpresa,
      documentoPDF,
    } = req.body;

    const oferta = {
      planosModificados: planosModificados || [],
      presupuestoItems: presupuestoItems || [],
      presupuestoEstimado: presupuestoEstimado || 0,
      precioTotalEstimado: precioTotalEstimado != null ? precioTotalEstimado : null,
      precioTotal: precioTotal || precioTotalEstimado || 0,
      costeHardware: costeHardware || 0,
      costeHorasTrabajo: costeHorasTrabajo || 0,
      costeTransporte: costeTransporte || 0,
      fechaInicioInstalacion,
      duracionEstimadaDias,
      notasEmpresa: notasEmpresa || '',
      documentoPDF: documentoPDF || null,
      fechaCreacionOferta: proyecto.oferta?.fechaCreacionOferta || new Date(),
      creadaPor: proyecto.oferta?.creadaPor || req.usuario.id,
      // Preserve existing signature if any
      firmaCliente: proyecto.oferta?.firmaCliente || null,
      fechaFirma: proyecto.oferta?.fechaFirma || null,
      fechaEnvioOferta: proyecto.oferta?.fechaEnvioOferta || null,
    };

    // Always transition to offer_ready when saving a draft (offer prepared but not sent)
    const estadoActual = proyecto.estado;
    const nuevoEstado = 'offer_ready';

    const historialEntry = estadoActual !== 'offer_ready' ? {
      estadoAnterior: estadoActual,
      estadoNuevo: 'offer_ready',
      fecha: new Date(),
      usuarioId: req.usuario.id,
      comentario: 'Offer draft saved',
    } : null;

    const updateOp = {
      $set: { oferta, estado: nuevoEstado, fechaActualizacion: Date.now(), fechaUltimaActividad: Date.now() },
    };
    if (historialEntry) updateOp.$push = { historialEstados: historialEntry };

    const proyectoGuardado = await Project.findByIdAndUpdate(
      req.params.id,
      updateOp,
      { new: true, runValidators: false }
    );

    console.log('✅ Offer draft saved for project:', proyectoGuardado._id, '→ estado:', proyectoGuardado.estado);
    res.json({ mensaje: 'Offer saved successfully', proyecto: proyectoGuardado });
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// POST /api/proyectos/:id/enviar-oferta - Send offer to client (admin only)
// ============================================================
const enviarOferta = async (req, res) => {
  try {
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Only administrators can send offers' });
    }

    const proyecto = await Project.findById(req.params.id);
    if (!proyecto) return res.status(404).json({ error: 'Project not found' });

    if (!proyecto.oferta) {
      return res.status(400).json({ error: 'No offer has been prepared for this project' });
    }

    // Admin can send the offer from any state that makes sense (offer_ready, created, or offer_sent re-sends)
    const nonSendableStates = ['working', 'finished', 'pending_payment', 'paid', 'rejected'];
    if (nonSendableStates.includes(proyecto.estado)) {
      return res.status(400).json({ error: `Cannot send offer for project in state: ${proyecto.estado}` });
    }

    const historialEnvio = {
      estadoAnterior: proyecto.estado,
      estadoNuevo: 'offer_sent',
      fecha: new Date(),
      usuarioId: req.usuario.id,
      comentario: 'Offer sent to client',
    };

    const proyectoEnviado = await Project.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          'oferta.fechaEnvioOferta': new Date(),
          estado: 'offer_sent',
          fechaActualizacion: Date.now(),
          fechaUltimaActividad: Date.now(),
        },
        $push: { historialEstados: historialEnvio },
      },
      { new: true }
    );

    // Send email notification to client
    const cliente = await User.findById(proyectoEnviado.usuarioId);
    if (cliente) {
      await emailService.notifyOfferSent(proyectoEnviado, cliente);
      // Create in-app notification for client
      await crearNotificacion({
        usuarioId: cliente._id,
        tipo: 'oferta_enviada',
        titulo: 'New Offer Received',
        mensaje: `You have received a new offer for project ${proyectoEnviado.tituloAutomatico || proyectoEnviado.nombreCasa}`,
        proyectoId: proyectoEnviado._id,
      });
    }

    console.log('✅ Offer sent for project:', proyectoEnviado._id);
    res.json({ mensaje: 'Offer sent to client', proyecto: proyectoEnviado });
  } catch (error) {
    console.error('Error sending offer:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// POST /api/proyectos/:id/aprobar - Client approves and signs contract
// ============================================================
const aprobarContrato = async (req, res) => {
  try {
    const proyecto = await Project.findById(req.params.id);
    if (!proyecto) return res.status(404).json({ error: 'Project not found' });

    // Must be the project owner
    if (proyecto.usuarioId.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'Only the project owner can approve' });
    }

    if (proyecto.estado !== 'offer_sent') {
      return res.status(400).json({ error: `Cannot approve project in state: ${proyecto.estado}` });
    }

    const { firmaCliente, aceptaContrato, haLeidoDocumentacion } = req.body;

    if (!firmaCliente) {
      return res.status(400).json({ error: 'Signature is required' });
    }
    if (!aceptaContrato || !haLeidoDocumentacion) {
      return res.status(400).json({ error: 'You must accept the contract and confirm reading the documentation' });
    }

    // Update offer with signature
    proyecto.oferta.firmaCliente = firmaCliente;
    proyecto.oferta.fechaFirma = new Date();
    proyecto.oferta.aceptaContrato = true;
    proyecto.oferta.haLeidoDocumentacion = true;

    // State → working
    await cambiarEstado(proyecto, 'working', req.usuario.id, 'Client approved and signed contract');
    await proyecto.save();

    // Send notification to company
    const cliente = await User.findById(req.usuario.id);
    await emailService.notifyContractSigned(proyecto, cliente);
    // Notify all admins that contract was signed
    await notificarAdmins({
      tipo: 'contrato_firmado',
      titulo: 'Contract Signed',
      mensaje: `Client ${cliente.nombre} has signed the contract for project ${proyecto.tituloAutomatico || proyecto.nombreCasa}`,
      proyectoId: proyecto._id,
    });

    console.log('✅ Contract approved for project:', proyecto._id);
    res.json({ mensaje: 'Contract approved and signed', proyecto });
  } catch (error) {
    console.error('Error approving contract:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// POST /api/proyectos/:id/rechazar - Client rejects offer
// ============================================================
const rechazarOferta = async (req, res) => {
  try {
    const proyecto = await Project.findById(req.params.id);
    if (!proyecto) return res.status(404).json({ error: 'Project not found' });

    if (proyecto.usuarioId.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'Only the project owner can reject' });
    }

    if (proyecto.estado !== 'offer_sent') {
      return res.status(400).json({ error: `Cannot reject project in state: ${proyecto.estado}` });
    }

    const { motivo } = req.body;

    await cambiarEstado(proyecto, 'rejected', req.usuario.id, motivo || 'Client rejected the offer');
    await proyecto.save();

    // Notify admins that client rejected the offer
    const cliente = await User.findById(req.usuario.id);
    await notificarAdmins({
      tipo: 'oferta_rechazada',
      titulo: 'Offer Rejected',
      mensaje: `Client ${cliente.nombre} has rejected the offer for project ${proyecto.tituloAutomatico || proyecto.nombreCasa}`,
      proyectoId: proyecto._id,
    });

    res.json({ mensaje: 'Offer rejected', proyecto });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// POST /api/proyectos/:id/finalizar - Admin marks project as finished
// ============================================================
const finalizarProyecto = async (req, res) => {
  try {
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Only administrators can finalize projects' });
    }

    const proyecto = await Project.findById(req.params.id);
    if (!proyecto) return res.status(404).json({ error: 'Project not found' });

    if (proyecto.estado !== 'working') {
      return res.status(400).json({ error: `Cannot finalize project in state: ${proyecto.estado}` });
    }

    const { enviarCorreo, commissieResultaat } = req.body;

    // Store commission result if provided
    if (commissieResultaat) {
      proyecto.commissieResultaat = {
        ...commissieResultaat,
        datumAfgewerkt: commissieResultaat.datumAfgewerkt || new Date(),
      };
    }

    // State → pending_payment
    await cambiarEstado(proyecto, 'pending_payment', req.usuario.id, 'Project completed, pending payment');
    await proyecto.save();

    // Get client info
    const cliente = await User.findById(proyecto.usuarioId);
    
    // Send email if requested
    if (enviarCorreo && cliente) {
      await emailService.notifyProjectFinished(proyecto, cliente);
    }

    // Create in-app notification for client and update stats
    if (cliente) {
      await crearNotificacion({
        usuarioId: cliente._id,
        tipo: 'proyecto_finalizado',
        titulo: 'Project Ready for Payment',
        mensaje: `Your project ${proyecto.tituloAutomatico || proyecto.nombreCasa} is now pending payment`,
        proyectoId: proyecto._id,
      });
      
      // Update client's completed contracts count
      cliente.totalContratosCompletados += 1;
      await cliente.save();
    }

    console.log('✅ Project finalized:', proyecto._id);
    res.json({ mensaje: 'Project finalized', proyecto, emailSent: !!enviarCorreo });
  } catch (error) {
    console.error('Error finalizing project:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// POST /api/proyectos/:id/marcar-pagado - Admin marks as paid manually
// ============================================================
const marcarPagado = async (req, res) => {
  try {
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Only administrators can mark as paid' });
    }

    const proyecto = await Project.findById(req.params.id);
    if (!proyecto) return res.status(404).json({ error: 'Project not found' });

    if (proyecto.estado !== 'pending_payment') {
      return res.status(400).json({ error: `Cannot mark as paid in state: ${proyecto.estado}` });
    }

    await cambiarEstado(proyecto, 'paid', req.usuario.id, 'Payment received');
    await proyecto.save();

    // Send confirmation email to client
    const cliente = await User.findById(proyecto.usuarioId);
    if (cliente) {
      await emailService.notifyPaymentReceived(proyecto, cliente);
    }

    console.log('✅ Project marked as paid:', proyecto._id);
    res.json({ mensaje: 'Project marked as paid', proyecto });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// POST /api/proyectos/:id/cambiar-estado - Admin manual state change
// ============================================================
const cambiarEstadoManual = async (req, res) => {
  try {
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Only administrators can change state' });
    }

    const proyecto = await Project.findById(req.params.id);
    if (!proyecto) return res.status(404).json({ error: 'Project not found' });

    const { nuevoEstado, comentario } = req.body;

    const estadosValidos = ['created', 'offer_ready', 'offer_sent', 'approved', 'working', 'finished', 'pending_payment', 'paid', 'rejected'];
    if (!estadosValidos.includes(nuevoEstado)) {
      return res.status(400).json({ error: `Invalid state: ${nuevoEstado}` });
    }

    await cambiarEstado(proyecto, nuevoEstado, req.usuario.id, comentario || 'Manual state change');
    await proyecto.save();

    res.json({ mensaje: `State changed to ${nuevoEstado}`, proyecto });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// GET /api/proyectos/:id/historial - Get state history
// ============================================================
const obtenerHistorial = async (req, res) => {
  try {
    const proyecto = await Project.findById(req.params.id)
      .populate('historialEstados.usuarioId', 'nombre email rol');

    if (!proyecto) return res.status(404).json({ error: 'Project not found' });

    if (req.usuario.rol !== 'administrador' && proyecto.usuarioId.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(proyecto.historialEstados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  obtenerOferta,
  crearOferta,
  enviarOferta,
  aprobarContrato,
  rechazarOferta,
  finalizarProyecto,
  marcarPagado,
  cambiarEstadoManual,
  obtenerHistorial,
};
