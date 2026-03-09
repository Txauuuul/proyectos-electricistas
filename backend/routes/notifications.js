const express = require('express');
const { verificarToken } = require('../middleware/auth');
const {
  obtenerNotificaciones,
  contarNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
} = require('../controllers/notificationController');

const router = express.Router();
router.use(verificarToken);

router.get('/', obtenerNotificaciones);
router.get('/no-leidas', contarNoLeidas);
router.put('/leer-todas', marcarTodasLeidas);
router.put('/:id/leer', marcarLeida);

module.exports = router;
