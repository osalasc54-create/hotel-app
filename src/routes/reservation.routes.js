const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservation.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/', authMiddleware, reservationController.createReservation);

router.get(
  '/hotel/:hotelId',
  reservationController.getReservationsByHotel
);

module.exports = router;