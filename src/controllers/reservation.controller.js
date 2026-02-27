const db = require('../config/db');

// 🔥 Crear reserva
exports.createReservation = async (req, res) => {
  const { hotel_id, start_date, end_date } = req.body;

  try {
    const user_id = req.user.id;

    if (!hotel_id || !start_date || !end_date) {
      return res.status(400).json({ message: 'Datos incompletos' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ❌ No permitir fechas pasadas
    if (start < today) {
      return res.status(400).json({
        message: 'No puedes reservar fechas pasadas'
      });
    }

    // ❌ Validar rango lógico
    if (end <= start) {
      return res.status(400).json({
        message: 'La fecha de salida debe ser posterior'
      });
    }

    // ❌ Verificar solapamiento
    const [conflicts] = await db.query(
      `
      SELECT id FROM reservations
      WHERE hotel_id = ?
      AND NOT (
        end_date <= ?
        OR start_date >= ?
      )
      `,
      [hotel_id, start_date, end_date]
    );

    if (conflicts.length > 0) {
      return res.status(400).json({
        message: 'El hotel ya está reservado en esas fechas'
      });
    }

    // 🔥 Calcular noches
    const diffTime = end - start;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 🔥 Obtener precio actual
    const [hotelRows] = await db.query(
      `SELECT price FROM hotels WHERE id = ?`,
      [hotel_id]
    );

    if (!hotelRows.length) {
      return res.status(404).json({
        message: 'Hotel no encontrado'
      });
    }

    const pricePerNight = hotelRows[0].price;
    const total = pricePerNight * nights;

    // 🔥 Insertar reserva
    await db.query(
      `
      INSERT INTO reservations
      (user_id, hotel_id, start_date, end_date, total_price)
      VALUES (?, ?, ?, ?, ?)
      `,
      [user_id, hotel_id, start_date, end_date, total]
    );

    res.status(201).json({
      message: 'Reserva confirmada',
      nights,
      total_price: total
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Error al crear la reserva'
    });
  }
};

// 🔥 Obtener reservas por hotel
exports.getReservationsByHotel = async (req, res) => {
  const { hotelId } = req.params;

  try {
    const [rows] = await db.query(
      `
      SELECT start_date, end_date
      FROM reservations
      WHERE hotel_id = ?
      `,
      [hotelId]
    );

    res.json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Error obteniendo reservas'
    });
  }
};

// ===============================
// OBTENER MIS RESERVAS
// ===============================

exports.getMyReservations = async (req, res) => {
  try {

    const db = require('../config/db'); // usa tu conexión real si es diferente

    const [rows] = await db.query(`
      SELECT 
        r.id,
        r.start_date,
        r.end_date,
        r.total_price,
        r.created_at,
        h.name,
        h.location
      FROM reservations r
      JOIN hotels h ON r.hotel_id = h.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    res.json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo reservaciones' });
  }
};

// ===============================
// CANCELAR RESERVA
// ===============================

exports.cancelReservation = async (req, res) => {
  try {

    const db = require('../config/db');
    const reservationId = req.params.id;

    // 1️⃣ Verificar que exista y pertenezca al usuario
    const [rows] = await db.query(
      'SELECT * FROM reservations WHERE id = ? AND user_id = ?',
      [reservationId, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    // 2️⃣ Eliminar reserva
    await db.query(
      'DELETE FROM reservations WHERE id = ?',
      [reservationId]
    );

    res.json({ message: 'Reserva cancelada correctamente' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error cancelando reserva' });
  }
};