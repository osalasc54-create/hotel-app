const Stripe = require('stripe');
const db = require('../config/db');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = async (req, res) => {
  const { hotel_id, start_date, end_date } = req.body;

  try {
    if (!hotel_id || !start_date || !end_date) {
      return res.status(400).json({ message: 'Datos incompletos' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (end <= start) {
      return res.status(400).json({ message: 'Fechas inválidas' });
    }

    const diffTime = end - start;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const [hotelRows] = await db.query(
      `SELECT price FROM hotels WHERE id = ?`,
      [hotel_id]
    );

    if (!hotelRows.length) {
      return res.status(404).json({ message: 'Hotel no encontrado' });
    }

    const pricePerNight = hotelRows[0].price;
    const total = pricePerNight * nights;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Stripe trabaja en centavos
      currency: 'mxn',
      metadata: {
        hotel_id,
        start_date,
        end_date,
        nights
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      total,
      nights
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creando PaymentIntent' });
  }
};