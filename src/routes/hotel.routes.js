const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotel.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

// público
router.get('/', hotelController.getAll);

// SOLO ADMIN puede crear
router.post(
  '/',
  authMiddleware,
  authorizeRoles('admin'),
  hotelController.create
);

// SOLO ADMIN puede actualizar
router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('admin'),
  hotelController.update
);

// SOLO ADMIN puede eliminar
router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('admin'),
  hotelController.remove
);

module.exports = router;