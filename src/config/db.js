const mysql = require('mysql2/promise');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let pool = null;

async function connectWithRetry() {
  let attempt = 1;

  while (!pool) {
    try {
      const candidatePool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      const conn = await candidatePool.getConnection();
      conn.release();

      pool = candidatePool;
      console.log('✅ Conectado a MySQL correctamente');
      return pool;

    } catch (err) {
      if (attempt === 1 || attempt % 5 === 0) {
        console.log(`⏳ MySQL no listo... intento ${attempt}. Reintentando en 5s`);
      }
      attempt++;
      await wait(5000);
    }
  }
}

const poolPromise = connectWithRetry();

module.exports = {
  query: async (...args) => {
    const activePool = pool || await poolPromise;
    return activePool.query(...args);
  }
};
