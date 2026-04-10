const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
};

if (process.env.DB_SSL === 'true') {
  dbConfig.ssl = {
    rejectUnauthorized: false
  };
}

const db = mysql.createPool(dbConfig);

(async () => {
  try {
    const connection = await db.getConnection();
    console.log('Conectado a MySQL correctamente');
    connection.release();
  } catch (error) {
    console.error('Error conectando a MySQL:', error.message);
  }
})();

module.exports = db;