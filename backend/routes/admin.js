const express = require('express');
const { statsElectricistas, statsGlobales } = require('../controllers/statsController');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

router.get('/stats-electricistas', statsElectricistas);
router.get('/stats-globales', statsGlobales);

module.exports = router;
