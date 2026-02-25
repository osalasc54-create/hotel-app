const db = require('../config/db');

exports.createReservation = async (req, res) => {
  const { hotel_id, start_date, end_date } = req.body;

  try {
    const user_id = req.user.id;

    // 🔎 Validaciones básicas
    if (!hotel_id || !start_date || !end_date) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: 'Formato de fecha inválido' });
    }

    if (end <= start) {
      return res.status(400).json({ message: 'La fecha de salida debe ser posterior a la entrada' });
    }

    // 📌 Calcular número de noches
    const diffTime = end - start;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 🔎 Obtener precio del hotel desde DB
    const [hotelRows] = await db.query(
      `SELECT price FROM hotels WHERE id = ?`,
      [hotel_id]
    );

    if (!hotelRows.length) {
      return res.status(404).json({ message: 'Hotel no encontrado' });
    }

    const pricePerNight = hotelRows[0].price;

    // 💰 Calcular total real (backend manda)
    const total_price = pricePerNight * nights;

    // 💾 Insertar reserva con total_price
    await db.query(
      `INSERT INTO reservations 
       (user_id, hotel_id, start_date, end_date, total_price)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, hotel_id, start_date, end_date, total_price]
    );

    res.status(201).json({
      message: 'Reserva confirmada',
      nights,
      price_per_night: pricePerNight,
      total_price
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear la reserva' });
  }
};