const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotel.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// público
router.get('/', hotelController.getAll);

// protegidas
router.post('/', authMiddleware, hotelController.create);
router.put('/:id', authMiddleware, hotelController.update);
router.delete('/:id', authMiddleware, hotelController.remove);

module.exports = router;
