const express = require('express');
const { verificarToken } = require('../middleware/auth');
const {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  listarTodosClientes,
} = require('../controllers/endClientController');

const router = express.Router();
router.use(verificarToken);

// Admin: all end-clients across all electricians
router.get('/admin/all', listarTodosClientes);

// Electrician's end-clients
router.get('/', listarClientes);
router.get('/:id', obtenerCliente);
router.post('/', crearCliente);
router.put('/:id', actualizarCliente);
router.delete('/:id', eliminarCliente);

module.exports = router;
