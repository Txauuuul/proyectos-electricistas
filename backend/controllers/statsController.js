const Project = require('../models/Project');
const User = require('../models/User');

// GET /api/admin/stats-electricistas
// Returns performance metrics per electrician (admin only)
const statsElectricistas = async (req, res) => {
  try {
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Admin only' });
    }

    // Fetch all electricians and all projects
    const [electricistas, proyectos] = await Promise.all([
      User.find({ rol: 'electricista', activo: true })
        .select('nombre apellidos email empresa fechaRegistro contadorObras logo')
        .lean(),
      Project.find({}).select(
        'usuarioId estado oferta fechaCreacion fechaInicio historialEstados ruimtes planos fotosLocalizacion tituloAutomatico tituloPersonalizado'
      ).lean(),
    ]);

    const CONVERSION_STATES = ['approved', 'working', 'finished', 'pending_payment', 'paid'];
    const ACTIVE_STATES = ['created', 'offer_ready', 'offer_sent', 'approved', 'working', 'finished', 'pending_payment'];

    // Helper to get effective price from a project offer
    const getPrice = (p) => p.oferta?.precioTotalEstimado ?? p.oferta?.precioTotal ?? 0;

    const stats = electricistas.map((e) => {
      const mis = proyectos.filter(p => p.usuarioId?.toString() === e._id.toString());

      const total = mis.length;
      const pagados = mis.filter(p => p.estado === 'paid');
      const activos = mis.filter(p => ACTIVE_STATES.includes(p.estado));
      const conOferta = mis.filter(p => ['offer_sent', 'approved', 'working', 'finished', 'pending_payment', 'paid', 'rejected'].includes(p.estado));
      const convertidos = mis.filter(p => CONVERSION_STATES.includes(p.estado));
      const rechazados = mis.filter(p => p.estado === 'rejected');

      const ingresos = pagados.reduce((s, p) => s + getPrice(p), 0);
      const pipeline = mis
        .filter(p => ['offer_sent', 'approved', 'working', 'finished', 'pending_payment'].includes(p.estado))
        .reduce((s, p) => s + getPrice(p), 0);

      const tasaConversion = conOferta.length > 0
        ? Math.round((convertidos.length / conOferta.length) * 100)
        : 0;

      // Average days from project creation to offer approval
      const tiemposCierre = pagados.map(p => {
        const creation = new Date(p.fechaCreacion);
        const approval = p.historialEstados?.find(h => h.estadoNuevo === 'approved')?.fecha;
        if (!approval) return null;
        return Math.floor((new Date(approval) - creation) / (1000 * 60 * 60 * 24));
      }).filter(d => d !== null);

      const diasPromedioCierre = tiemposCierre.length > 0
        ? Math.round(tiemposCierre.reduce((a, b) => a + b, 0) / tiemposCierre.length)
        : null;

      // Most recent project date
      const ultimoProyecto = mis.length > 0
        ? new Date(Math.max(...mis.map(p => new Date(p.fechaCreacion))))
        : null;

      // Flatten everything at root level so the frontend can read directly
      return {
        _id: e._id,
        id: e._id,
        nombre: e.nombre,
        apellidos: e.apellidos,
        email: e.email,
        empresa: e.empresa,
        logo: e.logo,
        fechaRegistro: e.fechaRegistro,
        // Stats flat at root
        totalProyectos: total,
        proyectosActivos: activos.length,
        proyectosPagados: pagados.length,
        proyectosRechazados: rechazados.length,
        tasaConversion,
        ingresosTotales: ingresos,
        pipeline,
        diasPromedioCierre,
        ultimoProyecto,
        // Project list for detail views
        proyectos: mis.map(p => ({
          _id: p._id,
          titulo: p.tituloAutomatico || p.tituloPersonalizado,
          estado: p.estado,
          precioTotal: getPrice(p),
          fechaCreacion: p.fechaCreacion,
        })),
      };
    });

    // Sort by total revenue desc
    stats.sort((a, b) => b.ingresosTotales - a.ingresosTotales);

    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/stats-globales
// Returns global company KPIs
const statsGlobales = async (req, res) => {
  try {
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const proyectos = await Project.find({}).select('estado oferta fechaCreacion').lean();

    const getPrice = (p) => p.oferta?.precioTotalEstimado ?? p.oferta?.precioTotal ?? 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonth = proyectos.filter(p => new Date(p.fechaCreacion) >= startOfMonth);
    const lastMonth = proyectos.filter(p => {
      const d = new Date(p.fechaCreacion);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    });

    const revenueThisMonth = proyectos
      .filter(p => p.estado === 'paid' && new Date(p.fechaCreacion) >= startOfMonth)
      .reduce((s, p) => s + getPrice(p), 0);

    const revenueLastMonth = proyectos
      .filter(p => {
        const d = new Date(p.fechaCreacion);
        return p.estado === 'paid' && d >= startOfLastMonth && d <= endOfLastMonth;
      })
      .reduce((s, p) => s + getPrice(p), 0);

    // Build monthly revenue trend for the last 6 months
    const mensual = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const ingresos = proyectos
        .filter(p => {
          const d = new Date(p.fechaCreacion);
          return p.estado === 'paid' && d >= monthStart && d <= monthEnd;
        })
        .reduce((s, p) => s + getPrice(p), 0);
      mensual.push({
        periodo: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        ingresos,
      });
    }

    const tasaCrecimiento = revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : null;

    res.json({
      totalProyectos: proyectos.length,
      proyectosEsteMes: thisMonth.length,
      proyectosMesAnterior: lastMonth.length,
      revenueThisMonth,
      revenueLastMonth,
      revenueGrowth: tasaCrecimiento,
      tasaCrecimiento,
      mensual,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { statsElectricistas, statsGlobales };