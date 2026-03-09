const express = require('express');
const { obtenerMensajes, enviarMensaje, contarNoLeidos } = require('../controllers/chatController');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

router.get('/:proyectoId', obtenerMensajes);
router.post('/:proyectoId', enviarMensaje);
router.get('/:proyectoId/unread', contarNoLeidos);

module.exports = router;
