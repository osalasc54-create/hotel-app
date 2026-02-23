const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Test de conexión
(async () => {
  try {
    const connection = await db.getConnection();
    console.log('Conectado a MySQL (pool)');
    connection.release();
  } catch (error) {
    console.error('Error conectando a MySQL:', error.message);
  }
})();

module.exports = db;