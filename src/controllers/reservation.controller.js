const db = require('../config/db');

exports.createReservation = async (req, res) => {
  const { hotel_id, start_date, end_date } = req.body;

  try {
    const user_id = req.user.id;

    await db.query(
      `INSERT INTO reservations (user_id, hotel_id, start_date, end_date)
       VALUES (?, ?, ?, ?)`,
      [user_id, hotel_id, start_date, end_date]
    );

    res.status(201).json({ message: 'Reserva confirmada' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear la reserva' });
  }
};