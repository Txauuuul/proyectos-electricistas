const express = require('express');
const { verificarToken } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  getProfileById,
  updateProfileById,
  getAllElectricistas,
  changePassword,
} = require('../controllers/profileController');

const router = express.Router();
router.use(verificarToken);

// Current user profile
router.get('/', getProfile);
router.put('/', updateProfile);
router.put('/change-password', changePassword);

// Admin: list all electricians
router.get('/all/electricistas', getAllElectricistas);

// Admin: get/update specific user
router.get('/:id', getProfileById);
router.put('/:id', updateProfileById);

module.exports = router;
