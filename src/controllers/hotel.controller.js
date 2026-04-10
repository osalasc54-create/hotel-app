const db = require('../config/db');
const logger = require('../utils/logger');

const getAll = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM hotels');
    logger.info('Consulta de hoteles realizada');
    res.json(rows);
  } catch (error) {
    console.error(error);
    logger.error(`Error al obtener hoteles: ${error.message}`);
    res.status(500).json({ message: 'Error al obtener hoteles' });
  }
};

const create = async (req, res) => {
  try {
    const { name, location, price } = req.body;

    await db.query(
      'INSERT INTO hotels (name, location, price) VALUES (?, ?, ?)',
      [name, location, price]
    );

    logger.info(`Hotel creado correctamente: ${name}`);

    res.status(201).json({ message: 'Hotel creado correctamente' });
  } catch (error) {
    console.error(error);
    logger.error(`Error al crear hotel: ${error.message}`);
    res.status(500).json({ message: 'Error al crear hotel' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, price } = req.body;

    await db.query(
      'UPDATE hotels SET name=?, location=?, price=? WHERE id=?',
      [name, location, price, id]
    );

    logger.info(`Hotel actualizado correctamente. ID: ${id}`);

    res.json({ message: 'Hotel actualizado correctamente' });
  } catch (error) {
    console.error(error);
    logger.error(`Error al actualizar hotel: ${error.message}`);
    res.status(500).json({ message: 'Error al actualizar hotel' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM hotels WHERE id=?', [id]);

    logger.info(`Hotel eliminado correctamente. ID: ${id}`);

    res.json({ message: 'Hotel eliminado correctamente' });
  } catch (error) {
    console.error(error);
    logger.error(`Error al eliminar hotel: ${error.message}`);
    res.status(500).json({ message: 'Error al eliminar hotel' });
  }
};

module.exports = {
  getAll,
  create,
  update,
  remove
};