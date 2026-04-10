const db = require('../config/db');
const logger = require('../utils/logger');

// 🔥 Crear reserva
exports.createReservation = async (req, res) => {
  const { hotel_id, start_date, end_date, guests = 1, rooms = 1 } = req.body;

  try {
    const user_id = req.user.id;

    if (!hotel_id || !start_date || !end_date) {
      logger.error('Error al crear reserva: datos incompletos');
      return res.status(400).json({ message: 'Datos incompletos' });
    }

    if (guests < 1 || rooms < 1) {
      logger.error('Error al crear reserva: valores inválidos en guests o rooms');
      return res.status(400).json({
        message: 'Valores inválidos'
      });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      logger.error(`Reserva rechazada: fecha pasada para usuario ${user_id}`);
      return res.status(400).json({
        message: 'No puedes reservar fechas pasadas'
      });
    }

    if (end <= start) {
      logger.error(`Reserva rechazada: rango inválido para usuario ${user_id}`);
      return res.status(400).json({
        message: 'La fecha de salida debe ser posterior'
      });
    }

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
      logger.error(`Reserva rechazada por solapamiento. Usuario ${user_id}, hotel ${hotel_id}`);
      return res.status(400).json({
        message: 'El hotel ya está reservado en esas fechas'
      });
    }

    const diffTime = end - start;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const [hotelRows] = await db.query(
      `SELECT price FROM hotels WHERE id = ?`,
      [hotel_id]
    );

    if (!hotelRows.length) {
      logger.error(`Reserva fallida: hotel no encontrado ID ${hotel_id}`);
      return res.status(404).json({
        message: 'Hotel no encontrado'
      });
    }

    const pricePerNight = hotelRows[0].price;
    const minRoomsRequired = Math.ceil(guests / 2);

    if (rooms < minRoomsRequired) {
      logger.error(`Reserva rechazada: habitaciones insuficientes. Usuario ${user_id}`);
      return res.status(400).json({
        message: `Se requieren mínimo ${minRoomsRequired} habitaciones para ${guests} huéspedes`
      });
    }

    const total = pricePerNight * nights * rooms;

    await db.query(
      `
      INSERT INTO reservations
      (user_id, hotel_id, start_date, end_date, total_price, guests, rooms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [user_id, hotel_id, start_date, end_date, total, guests, rooms]
    );

    logger.info(`Reserva creada por usuario ${user_id} para hotel ${hotel_id}`);

    res.status(201).json({
      message: 'Reserva confirmada',
      nights,
      guests,
      rooms,
      total_price: total
    });

  } catch (error) {
    console.error(error);
    logger.error(`Error al crear reserva: ${error.message}`);
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

    logger.info(`Consulta de reservas por hotel. Hotel ID: ${hotelId}`);
    res.json(rows);

  } catch (error) {
    console.error(error);
    logger.error(`Error obteniendo reservas por hotel: ${error.message}`);
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
    const [rows] = await db.query(`
      SELECT 
        r.id,
        r.start_date,
        r.end_date,
        r.total_price,
        r.guests,
        r.rooms,
        r.created_at,
        h.name,
        h.location
      FROM reservations r
      JOIN hotels h ON r.hotel_id = h.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    logger.info(`Consulta de reservaciones del usuario ${req.user.id}`);
    res.json(rows);

  } catch (error) {
    console.error(error);
    logger.error(`Error obteniendo reservaciones del usuario: ${error.message}`);
    res.status(500).json({ message: 'Error obteniendo reservaciones' });
  }
};

// ===============================
// CANCELAR RESERVA
// ===============================

exports.cancelReservation = async (req, res) => {
  try {
    const reservationId = req.params.id;

    const [rows] = await db.query(
      'SELECT * FROM reservations WHERE id = ? AND user_id = ?',
      [reservationId, req.user.id]
    );

    if (!rows.length) {
      logger.error(`Reserva no encontrada para cancelar. ID: ${reservationId}, usuario: ${req.user.id}`);
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    await db.query(
      'DELETE FROM reservations WHERE id = ?',
      [reservationId]
    );

    logger.info(`Reserva cancelada correctamente. ID: ${reservationId}, usuario: ${req.user.id}`);
    res.json({ message: 'Reserva cancelada correctamente' });

  } catch (error) {
    console.error(error);
    logger.error(`Error cancelando reserva: ${error.message}`);
    res.status(500).json({ message: 'Error cancelando reserva' });
  }
};

// ===============================
// ACTUALIZAR RESERVA
// ===============================

exports.updateReservation = async (req, res) => {
  const { start_date, end_date, guests = 1, rooms = 1 } = req.body;

  try {
    const reservationId = req.params.id;

    const [existing] = await db.query(
      'SELECT * FROM reservations WHERE id = ? AND user_id = ?',
      [reservationId, req.user.id]
    );

    if (!existing.length) {
      logger.error(`Reserva no encontrada para actualizar. ID: ${reservationId}, usuario: ${req.user.id}`);
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    const hotel_id = existing[0].hotel_id;

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (end <= start) {
      logger.error(`Actualización de reserva rechazada por rango inválido. ID: ${reservationId}`);
      return res.status(400).json({
        message: 'La fecha de salida debe ser posterior'
      });
    }

    const [conflicts] = await db.query(
      `
      SELECT id FROM reservations
      WHERE hotel_id = ?
      AND id != ?
      AND NOT (
        end_date <= ?
        OR start_date >= ?
      )
      `,
      [hotel_id, reservationId, start_date, end_date]
    );

    if (conflicts.length > 0) {
      logger.error(`Actualización de reserva rechazada por solapamiento. ID: ${reservationId}`);
      return res.status(400).json({
        message: 'El hotel ya está reservado en esas fechas'
      });
    }

    const diffTime = end - start;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const [hotelRows] = await db.query(
      `SELECT price FROM hotels WHERE id = ?`,
      [hotel_id]
    );

    const pricePerNight = hotelRows[0].price;
    const minRoomsRequired = Math.ceil(guests / 2);

    if (rooms < minRoomsRequired) {
      logger.error(`Actualización rechazada por habitaciones insuficientes. ID: ${reservationId}`);
      return res.status(400).json({
        message: `Se requieren mínimo ${minRoomsRequired} habitaciones para ${guests} huéspedes`
      });
    }

    const total = pricePerNight * nights * rooms;

    await db.query(
      `
      UPDATE reservations
      SET start_date = ?, end_date = ?, guests = ?, rooms = ?, total_price = ?
      WHERE id = ?
      `,
      [start_date, end_date, guests, rooms, total, reservationId]
    );

    logger.info(`Reserva actualizada correctamente. ID: ${reservationId}, usuario: ${req.user.id}`);

    res.json({
      message: 'Reserva actualizada',
      nights,
      guests,
      rooms,
      total_price: total
    });

  } catch (error) {
    console.error(error);
    logger.error(`Error actualizando reserva: ${error.message}`);
    res.status(500).json({
      message: 'Error actualizando reserva'
    });
  }
};