const Stripe = require('stripe');
const db = require('../config/db');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Fechas requeridas' });
    }

    if (guests < 1 || rooms < 1) {
      return res.status(400).json({ message: 'Valores inválidos' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (end <= start) {
      return res.status(400).json({ message: 'Fechas inválidas' });
    }

    const diffTime = end - start;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let pricePerNight;

    // 🔥 CASO 1 — Reserva nueva
    if (hotel_id) {

      const [hotelRows] = await db.query(
        `SELECT price FROM hotels WHERE id = ?`,
        [hotel_id]
      );

      if (!hotelRows.length) {
        return res.status(404).json({ message: 'Hotel no encontrado' });
      }

      pricePerNight = hotelRows[0].price;
    }

    // 🔥 CASO 2 — Modificación de reserva
    else if (reservation_id) {

      const [reservationRows] = await db.query(
        `SELECT h.price 
         FROM reservations r
         JOIN hotels h ON r.hotel_id = h.id
         WHERE r.id = ?`,
        [reservation_id]
      );

      if (!reservationRows.length) {
        return res.status(404).json({ message: 'Reserva no encontrada' });
      }

      pricePerNight = reservationRows[0].price;
    }

    else {
      return res.status(400).json({ message: 'Datos insuficientes' });
    }

    // 🔥 Siempre calcular internamente en MXN
    const totalMXN = pricePerNight * nights * rooms;

    // 🔥 Tipo de cambio fijo (puedes hacerlo dinámico después)
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

    res.json({
      clientSecret: paymentIntent.client_secret,
      total: totalMXN, // siempre regresamos el total base en MXN
      nights
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creando PaymentIntent' });
  }
};