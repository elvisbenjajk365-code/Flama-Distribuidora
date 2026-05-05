// ============================================================
//  FLAMA DISTRIBUIDORA — db.js
//  Pool de conexiones MySQL2
// ============================================================

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  port:            process.env.DB_PORT     || 3306,
  user:            process.env.DB_USER     || 'root',
  password:        process.env.DB_PASSWORD || '$Jhin1029',
  database:        process.env.DB_NAME     || 'flama_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:          0,
  timezone:           '-03:00',   // Argentina
});

// Test de conexión al arrancar
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL conectado correctamente');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err.message);
    process.exit(1);
  });

module.exports = pool;
