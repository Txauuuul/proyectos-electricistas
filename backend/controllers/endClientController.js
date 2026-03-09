const EndClient = require('../models/EndClient');
const Project = require('../models/Project');

// GET /api/clientes — List current electrician's end-clients (or another's if admin passes ?usuarioId=)
const listarClientes = async (req, res) => {
  try {
    // Admins can pass ?usuarioId=xxx to see another electrician's clients
    let electricistaId = req.usuario.id;
    if (req.usuario.rol === 'administrador' && req.query.usuarioId) {
      electricistaId = req.query.usuarioId;
    }

    const clientes = await EndClient.find({ electricistaId })
      .sort({ nombre: 1 });

    // Count projects per client
    const clientesConObras = await Promise.all(
      clientes.map(async (c) => {
        const numObras = await Project.countDocuments({ clienteId: c._id });
        return { ...c.toObject(), numObras };
      })
    );

    res.json(clientesConObras);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/clientes/:id — Get a single end-client with their projects
const obtenerCliente = async (req, res) => {
  try {
    const cliente = await EndClient.findById(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Client not found' });

    // Permission: own client or admin
    if (req.usuario.rol !== 'administrador' && cliente.electricistaId.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const proyectos = await Project.find({ clienteId: cliente._id })
      .select('tituloAutomatico tituloPersonalizado nombreCasa direccion estado fechaCreacion oferta.precioTotal')
      .sort({ fechaCreacion: -1 });

    res.json({ cliente, proyectos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/clientes — Create a new end-client
const crearCliente = async (req, res) => {
  try {
    const { nombre, apellidos, empresa, direccion, codigoPostal, ciudad, telefono, email, notas } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const cliente = new EndClient({
      electricistaId: req.usuario.id,
      nombre,
      apellidos: apellidos || '',
      empresa: empresa || '',
      direccion: direccion || '',
      codigoPostal: codigoPostal || '',
      ciudad: ciudad || '',
      telefono: telefono || '',
      email: email || '',
      notas: notas || '',
    });

    await cliente.save();
    res.status(201).json(cliente);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/clientes/:id — Update an end-client
const actualizarCliente = async (req, res) => {
  try {
    const cliente = await EndClient.findById(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Client not found' });

    if (cliente.electricistaId.toString() !== req.usuario.id && req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const fields = ['nombre', 'apellidos', 'empresa', 'direccion', 'codigoPostal', 'ciudad', 'telefono', 'email', 'notas'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) cliente[f] = req.body[f];
    });

    await cliente.save();
    res.json(cliente);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/clientes/:id — Delete an end-client
const eliminarCliente = async (req, res) => {
  try {
    const cliente = await EndClient.findById(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Client not found' });

    if (cliente.electricistaId.toString() !== req.usuario.id && req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Remove client reference from projects (don't delete projects)
    await Project.updateMany({ clienteId: cliente._id }, { clienteId: null });
    await EndClient.findByIdAndDelete(req.params.id);

    res.json({ mensaje: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/clientes/admin/all — Admin: list ALL end-clients across all electricistas
const listarTodosClientes = async (req, res) => {
  try {
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const clientes = await EndClient.find()
      .populate('electricistaId', 'nombre apellidos email empresa')
      .sort({ nombre: 1 });

    const clientesConObras = await Promise.all(
      clientes.map(async (c) => {
        const numObras = await Project.countDocuments({ clienteId: c._id });
        return { ...c.toObject(), numObras };
      })
    );

    res.json(clientesConObras);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  listarTodosClientes,
};
