const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const paymentController = require('../controllers/payments.controller');

router.post(
  '/create-payment-intent',
  authMiddleware,
  paymentController.createPaymentIntent
);

module.exports = router;