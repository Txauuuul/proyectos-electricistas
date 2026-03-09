const express = require('express');
const {
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
} = require('../controllers/projectController');
const {
  obtenerOferta,
  crearOferta,
  enviarOferta,
  aprobarContrato,
  rechazarOferta,
  finalizarProyecto,
  marcarPagado,
  cambiarEstadoManual,
  obtenerHistorial,
} = require('../controllers/offerController');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(verificarToken);

// Base project CRUD
router.get('/', obtenerProyectos);
router.get('/preview-titulo', previewTitulo);
router.get('/export/csv', exportarCSV);
router.get('/:id', obtenerProyecto);
router.post('/', crearProyecto);
router.put('/:id', actualizarProyecto);
router.delete('/:id', eliminarProyecto);

// Offer / Proposal workflow
router.get('/:id/oferta', obtenerOferta);
router.post('/:id/oferta', crearOferta);
router.post('/:id/enviar-oferta', enviarOferta);

// Client actions
router.post('/:id/aprobar', aprobarContrato);
router.post('/:id/rechazar', rechazarOferta);

// Post-signature: additional info & reopen/amendment
router.post('/:id/info-adicional', agregarInfoAdicional);
router.post('/:id/proponer-cambios', crearPropuestaCliente);
router.post('/:id/reapertura', crearReapertura);
router.post('/:id/reapertura/:idx/firmar', firmarReapertura);

// Admin project lifecycle
router.post('/:id/finalizar', finalizarProyecto);
router.post('/:id/marcar-pagado', marcarPagado);
router.post('/:id/cambiar-estado', cambiarEstadoManual);

// History
router.get('/:id/historial', obtenerHistorial);

module.exports = router;
