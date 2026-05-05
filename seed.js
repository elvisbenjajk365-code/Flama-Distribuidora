// ============================================================
//  FLAMA DISTRIBUIDORA — seed.js
//  Crea el usuario admin inicial en la base de datos
//  Uso: node seed.js
// ============================================================

require('dotenv').config();
const bcrypt = require('bcrypt');
const db     = require('./db');

async function seed() {
  console.log('🌱 Iniciando seed de usuarios...\n');

  const usuarios = [
    {
      nombre:   'Admin Flama',
      email:    'admin@flamadistri.ar',
      password: 'Flama2024!',        // ← CAMBIÁ esto antes de producción
      rol:      'admin',
    },
    {
      nombre:   'Mayorista Demo',
      email:    'mayorista@demo.com',
      password: 'Demo1234!',
      rol:      'mayorista',
      telefono: '+54 11 1234-5678',
    },
  ];

  for (const u of usuarios) {
    try {
      // Verificar si ya existe
      const [existing] = await db.query('SELECT id FROM usuarios WHERE email = ?', [u.email]);
      if (existing.length) {
        console.log(`⚠️  ${u.email} ya existe, saltando...`);
        continue;
      }

      const hash = await bcrypt.hash(u.password, 12);
      const [result] = await db.query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, activo)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [u.nombre, u.email, hash, u.rol, u.telefono || null]
      );

      console.log(`✅ Creado: ${u.email} | Rol: ${u.rol} | ID: ${result.insertId}`);
    } catch (err) {
      console.error(`❌ Error creando ${u.email}:`, err.message);
    }
  }

  console.log('\n✅ Seed completado');
  process.exit(0);
}

seed();
