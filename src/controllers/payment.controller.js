const Stripe = require('stripe');
const db = require('../config/db');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = async (req, res) => {
  const { hotel_id, reservation_id, start_date, end_date, guests = 1, rooms = 1 } = req.body;

  try {

    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Datos incompletos' });
    }

    if (guests < 1 || rooms < 1) {
      return res.status(400).json({
        message: 'Valores inválidos'
      });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (end <= start) {
      return res.status(400).json({ message: 'Fechas inválidas' });
    }

    const diffTime = end - start;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let finalHotelId = hotel_id;

    // 🔥 Si viene reservation_id → buscar hotel_id automáticamente
    if (reservation_id) {
      const [reservationRows] = await db.query(
        `SELECT hotel_id FROM reservations WHERE id = ? AND user_id = ?`,
        [reservation_id, req.user.id]
      );

      if (!reservationRows.length) {
        return res.status(404).json({ message: 'Reserva no encontrada' });
      }

      finalHotelId = reservationRows[0].hotel_id;
    }

    if (!finalHotelId) {
      return res.status(400).json({ message: 'Hotel no especificado' });
    }

    const [hotelRows] = await db.query(
      `SELECT price FROM hotels WHERE id = ?`,
      [finalHotelId]
    );

    if (!hotelRows.length) {
      return res.status(404).json({ message: 'Hotel no encontrado' });
    }

    const pricePerNight = hotelRows[0].price;

    const total = pricePerNight * nights * rooms;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'mxn',
      metadata: {
        hotel_id: finalHotelId,
        reservation_id: reservation_id || null,
        start_date,
        end_date,
        nights,
        guests,
        rooms
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      total,
      nights,
      guests,
      rooms
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creando PaymentIntent' });
  }
};