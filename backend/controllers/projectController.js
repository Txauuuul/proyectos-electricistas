const Project = require('../models/Project');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { crearNotificacion, notificarAdmins } = require('./notificationController');

// Obtener todos los proyectos del usuario actual (para electricistas)
// O todos los proyectos si es administrador
// Soporta paginación: ?page=1&limit=20 (sin parámetros → devuelve todos, retrocompatible)
const obtenerProyectos = async (req, res) => {
  try {
    let query = {};

    // Si es electricista, solo muestra sus proyectos
    if (req.usuario.rol === 'electricista') {
      query.usuarioId = req.usuario.id;
    }

    const { page, limit, search, estado: estadoFiltro } = req.query;

    // Filtro de búsqueda textual (admin)
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { nombreCasa: regex },
        { direccion: regex },
        { tituloAutomatico: regex },
        { tituloPersonalizado: regex },
      ];
    }

    // Filtro por estado
    if (estadoFiltro) {
      query.estado = estadoFiltro;
    }

    // Con paginación
    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
      const skip = (pageNum - 1) * limitNum;

      const [proyectos, total] = await Promise.all([
        Project.find(query)
          .populate('usuarioId', 'nombre email')
          .sort({ fechaCreacion: -1 })
          .skip(skip)
          .limit(limitNum),
        Project.countDocuments(query),
      ]);

      return res.json({
        proyectos,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      });
    }

    // Sin paginación (retrocompatible — devuelve array plano)
    const proyectos = await Project.find(query).populate('usuarioId', 'nombre email');
    res.json(proyectos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener un proyecto específico
const obtenerProyecto = async (req, res) => {
  try {
    const proyecto = await Project.findById(req.params.id);

    if (!proyecto) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    // Verificar permisos: debe ser el dueño o administrador
    if (req.usuario.rol !== 'administrador' && proyecto.usuarioId.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permiso para ver este proyecto' });
    }

    res.json(proyecto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear un proyecto nuevo (con opción de datos completos desde el wizard)
const crearProyecto = async (req, res) => {
  try {
    const {
      nombreCasa, direccion, fechaInicio,
      planos = [], fotosLocalizacion = [], clienteId, tituloPersonalizado,
      straat = '', nr = '', postcode = '', stad = '',
      ofertaDirectaCliente = true, extraInfo = '', ruimtes = [],
    } = req.body;

    // Build direccion from parts if not provided directly
    const direccionFinal = direccion || [straat, nr, postcode, stad].filter(Boolean).join(', ');

    // Validar datos requeridos
    if (!nombreCasa || !fechaInicio) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: nombreCasa, fechaInicio' 
      });
    }

    // Generate auto-title
    const electricista = await User.findById(req.usuario.id);
    const tituloAutomatico = electricista.generarTituloObra();

    // Always start as 'created'
    const proyecto = new Project({
      usuarioId: req.usuario.id,
      clienteId: clienteId || null,
      tituloAutomatico,
      tituloPersonalizado: tituloPersonalizado || '',
      nombreCasa,
      direccion: direccionFinal,
      straat, nr, postcode, stad,
      ofertaDirectaCliente,
      extraInfo,
      fechaInicio,
      planos,
      ruimtes,
      fotosLocalizacion,
      estado: 'created',
    });

    await proyecto.save();

    // Increment the electrician's obra counter
    electricista.contadorObras += 1;
    await electricista.save();

    console.log('✅ Proyecto creado:', proyecto._id, '| Título:', tituloAutomatico);

    // Send email notification to company
    try {
      await emailService.notifyNewProject(proyecto, electricista);
    } catch (emailError) {
      console.warn('Email notification failed (non-blocking):', emailError.message);
    }

    // Notify all admins via bell
    await notificarAdmins({
      tipo: 'new_project',
      titulo: 'New project created',
      mensaje: `${electricista.nombre} ${electricista.apellidos || ''} created project ${tituloAutomatico}`,
      proyectoId: proyecto._id,
    });

    res.status(201).json(proyecto);
  } catch (error) {
    console.error('Error al crear proyecto:', error);
    res.status(500).json({ error: error.message });
  }
};

// Actualizar proyecto (agregar planos, fotos, etc.)
const actualizarProyecto = async (req, res) => {
  try {
    // Check project exists and verify permissions first
    const proyectoExistente = await Project.findById(req.params.id).lean();

    if (!proyectoExistente) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    if (req.usuario.rol !== 'administrador' && proyectoExistente.usuarioId.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permiso para actualizar este proyecto' });
    }

    console.log('📝 Actualizando proyecto:', req.params.id);
    console.log('Campos recibidos:', Object.keys(req.body));

    // Build the $set object — use direct field paths so Mixed sub-fields always persist
    const campos = { fechaActualizacion: Date.now() };

    if (req.body.nombreCasa)       campos.nombreCasa       = req.body.nombreCasa;
    if (req.body.direccion)        campos.direccion        = req.body.direccion;
    if (req.body.fechaInicio)      campos.fechaInicio      = req.body.fechaInicio;
    if (req.body.fotosLocalizacion) campos.fotosLocalizacion = req.body.fotosLocalizacion;
    if (req.body.estado && req.usuario.rol === 'administrador') {
      campos.estado = req.body.estado;
    }

    if (req.body.planos) {
      console.log('📦 Guardando planos:', req.body.planos.length,
        '| Con dibujo:', req.body.planos.filter(p => p.dataDibujo).length,
        '| Con marcadores:', req.body.planos.filter(p => p.marcadores?.length).length);
      campos.planos = req.body.planos;
    }

    if (req.body.ruimtes) {
      console.log('📦 Guardando ruimtes:', req.body.ruimtes.length,
        '| Con marcadores:', req.body.ruimtes.filter(r => r.marcadores?.length).length,
        '| Con dataDibujo:', req.body.ruimtes.filter(r => r.dataDibujo).length);
      campos.ruimtes = req.body.ruimtes;
    }

    // notasInternas — only admins can save internal notes
    if (req.body.notasInternas !== undefined && req.usuario.rol === 'administrador') {
      campos.notasInternas = req.body.notasInternas;
    }

    // findByIdAndUpdate with $set bypasses Mongoose change-tracking entirely,
    // so Mixed-typed nested fields (dataDibujo, marcadores) are always written.
    const proyectoActualizado = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: campos },
      { new: true, runValidators: false }
    );

    console.log('✅ Proyecto guardado. Ruimtes en DB:', proyectoActualizado.ruimtes?.length,
      '| Planos en DB:', proyectoActualizado.planos?.length);
    res.json(proyectoActualizado);
  } catch (error) {
    console.error('❌ Error en actualizarProyecto:', error);
    res.status(500).json({ error: error.message });
  }
};

// Eliminar proyecto — ADMIN ONLY
const eliminarProyecto = async (req, res) => {
  try {
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Only administrators can delete projects' });
    }

    const proyecto = await Project.findById(req.params.id);
    if (!proyecto) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    await Project.findByIdAndDelete(req.params.id);
    res.json({ mensaje: 'Proyecto eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/proyectos/preview-titulo — Return what the next auto-title would be (no DB write)
const previewTitulo = async (req, res) => {
  try {
    const electricista = await User.findById(req.usuario.id);
    if (!electricista) return res.status(404).json({ error: 'User not found' });
    const titulo = electricista.generarTituloObra();
    res.json({ titulo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  obtenerProyectos,
  obtenerProyecto,
  crearProyecto,
  actualizarProyecto,
  eliminarProyecto,
  agregarInfoAdicional,
  crearReapertura,
  firmarReapertura,
  crearPropuestaCliente,
  previewTitulo,
  exportarCSV,
};

// POST /api/proyectos/:id/info-adicional — Add additional info after signing
async function agregarInfoAdicional(req, res) {
  try {
    const proyecto = await Project.findById(req.params.id);
    if (!proyecto) return res.status(404).json({ error: 'Project not found' });

    // Must be owner
    if (proyecto.usuarioId.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only after contract is signed (working, pending_payment, etc.)
    const allowedStates = ['working', 'finished', 'pending_payment'];
    if (!allowedStates.includes(proyecto.estado)) {
      return res.status(400).json({ error: 'Additional info can only be added after the contract is signed' });
    }

    const { texto, planos, fotos } = req.body;

    proyecto.infoAdicional.push({
      texto: texto || '',
      planos: planos || [],
      fotos: fotos || [],
      fecha: new Date(),
      usuarioId: req.usuario.id,
    });

    proyecto.fechaActualizacion = Date.now();
    proyecto.fechaUltimaActividad = Date.now();
    await proyecto.save();

    // Notify admins
    const electricista = await User.findById(req.usuario.id);
    await notificarAdmins({
      tipo: 'additional_info',
      titulo: 'Additional info added',
      mensaje: `${electricista.nombre} added info to project ${proyecto.tituloAutomatico || proyecto.nombreCasa}`,
      proyectoId: proyecto._id,
    });

    res.json({ mensaje: 'Additional info added', proyecto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/proyectos/:id/reapertura — Admin creates a reopen/amendment
async function crearReapertura(req, res) {
  try {
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Only administrators can create reopens' });
    }

    const proyecto = await Project.findById(req.params.id);
    if (!proyecto) return res.status(404).json({ error: 'Project not found' });

    // Can reopen projects that are working, finished, pending_payment, paid, or already offer_sent (re-amendment)
    const allowedStates = ['working', 'finished', 'pending_payment', 'paid', 'offer_sent'];
    if (!allowedStates.includes(proyecto.estado)) {
      return res.status(400).json({ error: 'Cannot reopen project in this state' });
    }

    const { descripcionCambios, presupuestoItems, presupuestoAdicional, documentoPDF } = req.body;

    const nuevaReapertura = {
      descripcionCambios: descripcionCambios || '',
      presupuestoItems: presupuestoItems || [],
      presupuestoAdicional: presupuestoAdicional || 0,
      documentoPDF: documentoPDF || null,
      aceptado: false,
      fechaCreacion: new Date(),
      creadaPor: req.usuario.id,
    };

    const nuevoHistorial = {
      estadoAnterior: proyecto.estado,
      estadoNuevo: 'offer_sent',
      fecha: new Date(),
      usuarioId: req.usuario.id,
      comentario: 'Amendment created — awaiting client re-signature',
    };

    // Use findByIdAndUpdate to reliably persist estado + push in one atomic operation
    const proyectoGuardado = await Project.findByIdAndUpdate(
      req.params.id,
      {
        $set: { estado: 'offer_sent', fechaActualizacion: Date.now() },
        $push: { reaperturas: nuevaReapertura, historialEstados: nuevoHistorial },
      },
      { new: true }
    );

    // Notify the electrician
    await crearNotificacion({
      usuarioId: proyectoGuardado.usuarioId,
      tipo: 'reopen',
      titulo: 'Project reopened',
      mensaje: `An amendment has been created for project ${proyectoGuardado.tituloAutomatico || proyectoGuardado.nombreCasa}. Please review and sign.`,
      proyectoId: proyectoGuardado._id,
    });

    res.json({ mensaje: 'Reopen created', proyecto: proyectoGuardado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/proyectos/:id/reapertura/:idx/firmar — Client signs a reopen
async function firmarReapertura(req, res) {
  try {
    const proyecto = await Project.findById(req.params.id);
    if (!proyecto) return res.status(404).json({ error: 'Project not found' });

    if (proyecto.usuarioId.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'Only the project owner can sign' });
    }

    const idx = parseInt(req.params.idx);
    if (!proyecto.reaperturas || !proyecto.reaperturas[idx]) {
      return res.status(404).json({ error: 'Amendment not found' });
    }

    const { firmaCliente } = req.body;
    if (!firmaCliente) {
      return res.status(400).json({ error: 'Signature is required' });
    }

    // Transition project to working after signing the amendment
    const estadoAntes = proyecto.estado;
    const nuevoEstado = ['paid', 'finished', 'pending_payment', 'offer_sent'].includes(proyecto.estado)
      ? 'working'
      : proyecto.estado;

    const historialEntry = nuevoEstado !== estadoAntes
      ? { estadoAnterior: estadoAntes, estadoNuevo: nuevoEstado, fecha: new Date(), usuarioId: req.usuario.id, comentario: 'Reopened via amendment' }
      : null;

    const updateOp = {
      $set: {
        [`reaperturas.${idx}.firmaCliente`]: firmaCliente,
        [`reaperturas.${idx}.fechaFirma`]: new Date(),
        [`reaperturas.${idx}.aceptado`]: true,
        estado: nuevoEstado,
        fechaActualizacion: Date.now(),
      },
    };
    if (historialEntry) updateOp.$push = { historialEstados: historialEntry };

    const proyectoActualizado = await Project.findByIdAndUpdate(req.params.id, updateOp, { new: true });
    const proyectoFinal = proyectoActualizado;

    // Notify admins
    await notificarAdmins({
      tipo: 'contract_signed',
      titulo: 'Amendment signed',
      mensaje: `Amendment for project ${proyectoFinal.tituloAutomatico || proyectoFinal.nombreCasa} was signed`,
      proyectoId: proyectoFinal._id,
    });

    res.json({ mensaje: 'Amendment signed', proyecto: proyectoFinal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/proyectos/:id/proponer-cambios — Client proposes changes
async function crearPropuestaCliente(req, res) {
  try {
    console.log('📝 Client proposing changes for project:', req.params.id);
    console.log('User ID:', req.usuario.id);
    
    const proyecto = await Project.findById(req.params.id);
    if (!proyecto) {
      console.log('❌ Project not found:', req.params.id);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only the project owner (electrician/client) can propose changes
    if (proyecto.usuarioId.toString() !== req.usuario.id) {
      console.log('❌ User not owner:', proyecto.usuarioId.toString(), '!==', req.usuario.id);
      return res.status(403).json({ error: 'Only the project owner can propose changes' });
    }

    // Can propose changes only in active states
    const allowedStates = ['working', 'pending_payment', 'paid', 'finished'];
    if (!allowedStates.includes(proyecto.estado)) {
      console.log('❌ Invalid state:', proyecto.estado);
      return res.status(400).json({ error: `Cannot propose changes for project in state: ${proyecto.estado}` });
    }

    const { demandas } = req.body;
    if (!demandas || !demandas.trim()) {
      console.log('❌ No demandas text provided');
      return res.status(400).json({ error: 'Change proposal text is required' });
    }

    console.log('✅ Adding proposal:', demandas);
    proyecto.propuestasCliente.push({
      demandas: demandas.trim(),
      fechaCreacion: new Date(),
    });

    proyecto.fechaActualizacion = Date.now();
    await proyecto.save();
    console.log('✅ Proposal saved');

    // Notify all admins of the new proposal
    try {
      const usuario = await User.findById(req.usuario.id);
      if (usuario) {
        console.log('📧 Notifying admins...');
        await notificarAdmins({
          tipo: 'cambios_propuestos',
          titulo: 'Client proposed changes',
          mensaje: `${usuario.nombre} ${usuario.apellidos || ''} proposed changes for project ${proyecto.tituloAutomatico || proyecto.nombreCasa}`,
          proyectoId: proyecto._id,
        });
      }
    } catch (notifErr) {
      console.warn('⚠️ Notification failed (non-blocking):', notifErr.message);
    }

    console.log('✅ Change proposal created successfully');
    res.json({ mensaje: 'Change proposal submitted', proyecto });
  } catch (err) {
    console.error('❌ Error creating proposal:', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/proyectos/export/csv — Export all projects as CSV (admin only)
async function exportarCSV(req, res) {
  try {
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Only administrators can export data' });
    }

    const proyectos = await Project.find({})
      .populate('usuarioId', 'nombre email')
      .lean();

    const ESTADO_LABELS = {
      created: 'Created', offer_ready: 'Offer Ready', offer_sent: 'Offer Sent',
      approved: 'Approved', working: 'Working', finished: 'Finished',
      pending_payment: 'Pending Payment', paid: 'Paid', rejected: 'Rejected',
    };

    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
    };

    const headers = [
      'ID', 'Auto Title', 'Custom Title', 'Address', 'Client Name',
      'Client Email', 'State', 'Start Date', 'Created At',
      'Floor Plans', 'Photos', 'Total Price (€)', 'Rooms',
    ];

    const rows = proyectos.map(p => [
      escape(p._id),
      escape(p.tituloAutomatico),
      escape(p.tituloPersonalizado),
      escape(p.direccion || [p.straat, p.nr, p.postcode, p.stad].filter(Boolean).join(', ')),
      escape(p.usuarioId?.nombre || ''),
      escape(p.usuarioId?.email || ''),
      escape(ESTADO_LABELS[p.estado] || p.estado),
      escape(p.fechaInicio ? new Date(p.fechaInicio).toLocaleDateString('nl-BE') : ''),
      escape(p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleDateString('nl-BE') : ''),
      escape(p.planos?.length || 0),
      escape(p.fotosLocalizacion?.length || 0),
      escape(p.oferta?.precioTotal?.toFixed(2) || ''),
      escape(p.ruimtes?.length || 0),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="proyectos-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send('\uFEFF' + csv); // BOM para que Excel abra bien el UTF-8
  } catch (err) {
    console.error('❌ Error exporting CSV:', err);
    res.status(500).json({ error: err.message });
  }
}
