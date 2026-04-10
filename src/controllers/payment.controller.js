const Stripe = require('stripe');
const db = require('../config/db');
const logger = require('../utils/logger');

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

exports.createPaymentIntent = async (req, res) => {
  const {
    hotel_id,
    reservation_id,
    start_date,
    end_date,
    guests = 1,
    rooms = 1,
    currency = 'mxn'
  } = req.body;

  try {
    if (!stripe) {
      logger.error('Stripe no configurado: falta STRIPE_SECRET_KEY');
      return res.status(500).json({
        message: 'Stripe no está configurado en el servidor'
      });
    }

    if (!start_date || !end_date) {
      logger.error('Error creando PaymentIntent: fechas requeridas');
      return res.status(400).json({ message: 'Fechas requeridas' });
    }

    if (guests < 1 || rooms < 1) {
      logger.error('Error creando PaymentIntent: valores inválidos');
      return res.status(400).json({ message: 'Valores inválidos' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (end <= start) {
      logger.error('Error creando PaymentIntent: fechas inválidas');
      return res.status(400).json({ message: 'Fechas inválidas' });
    }

    const diffTime = end - start;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let pricePerNight;

    if (hotel_id) {
      const [hotelRows] = await db.query(
        `SELECT price FROM hotels WHERE id = ?`,
        [hotel_id]
      );

      if (!hotelRows.length) {
        logger.error(`PaymentIntent fallido: hotel no encontrado ID ${hotel_id}`);
        return res.status(404).json({ message: 'Hotel no encontrado' });
      }

      pricePerNight = hotelRows[0].price;
    } else if (reservation_id) {
      const [reservationRows] = await db.query(
        `SELECT h.price 
         FROM reservations r
         JOIN hotels h ON r.hotel_id = h.id
         WHERE r.id = ?`,
        [reservation_id]
      );

      if (!reservationRows.length) {
        logger.error(`PaymentIntent fallido: reserva no encontrada ID ${reservation_id}`);
        return res.status(404).json({ message: 'Reserva no encontrada' });
      }

      pricePerNight = reservationRows[0].price;
    } else {
      logger.error('PaymentIntent fallido: datos insuficientes');
      return res.status(400).json({ message: 'Datos insuficientes' });
    }

    const totalMXN = pricePerNight * nights * rooms;
    const EXCHANGE_RATE = 17;

    let finalAmount;
    let stripeCurrency;

    if (currency === 'usd') {
      finalAmount = (totalMXN / EXCHANGE_RATE) * 100;
      stripeCurrency = 'usd';
    } else {
      finalAmount = totalMXN * 100;
      stripeCurrency = 'mxn';
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalAmount),
      currency: stripeCurrency,
      metadata: {
        hotel_id: hotel_id || '',
        reservation_id: reservation_id || '',
        start_date,
        end_date,
        nights,
        guests,
        rooms
      }
    });

    logger.info('PaymentIntent creado correctamente');

    res.json({
      clientSecret: paymentIntent.client_secret,
      total: totalMXN,
      nights
    });

  } catch (error) {
    console.error(error);
    logger.error(`Error creando PaymentIntent: ${error.message}`);
    res.status(500).json({ message: 'Error creando PaymentIntent' });
  }
};