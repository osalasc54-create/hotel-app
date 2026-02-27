const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservation.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Crear reserva
router.post('/', authMiddleware, reservationController.createReservation);

// 🔥 NUEVO → Obtener mis reservas
router.get('/my', authMiddleware, reservationController.getMyReservations);

// Obtener reservas por hotel
router.get(
  '/hotel/:hotelId',
  reservationController.getReservationsByHotel
);

module.exports = router;