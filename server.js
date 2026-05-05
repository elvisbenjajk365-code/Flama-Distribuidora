// ============================================================
//  FLAMA DISTRIBUIDORA — server.js
//  Express + MySQL2 + JWT + bcrypt
// ============================================================

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes             = require('./routes/auth');
const productosRoutes        = require('./routes/productos');
const { verifyToken, requireRole } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3001;

// ---- Seguridad ----
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());
// Servir archivos estáticos DESPUÉS de json() para que las rutas API funcionen
app.use(express.static(__dirname));

// ---- Rate limit login (anti fuerza bruta) ----
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Esperá 15 minutos.' },
});

// ---- Rutas públicas ----
app.use('/auth', loginLimiter, authRoutes);
app.use('/api/productos', productosRoutes);

// ---- Health check ----
app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ---- /me — usuario logueado (datos completos) ----
app.get('/me', verifyToken, async (req, res) => {
  const db = require('./db');
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, email, rol, telefono, localidad, direccion FROM usuarios WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Error al obtener usuario' }); }
});

// ---- Admin: listar usuarios ----
app.get('/admin/usuarios', verifyToken, requireRole('admin'), async (_req, res) => {
  const db = require('./db');
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, email, rol, activo, creado_en FROM usuarios ORDER BY creado_en DESC'
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Error al obtener usuarios' }); }
});

// ---- Admin: activar/desactivar usuario ----
app.put('/admin/usuarios/:id/toggle', verifyToken, requireRole('admin'), async (req, res) => {
  const db = require('./db');
  try {
    const [cur] = await db.query('SELECT activo FROM usuarios WHERE id=?', [req.params.id]);
    if (!cur.length) return res.status(404).json({ error: 'No encontrado' });
    const next = cur[0].activo ? 0 : 1;
    await db.query('UPDATE usuarios SET activo=? WHERE id=?', [next, req.params.id]);
    res.json({ activo: next });
  } catch { res.status(500).json({ error: 'Error al actualizar' }); }
});

// ---- Admin: crear usuario mayorista ----
app.post('/admin/usuarios', verifyToken, requireRole('admin'), async (req, res) => {
  const db     = require('./db');
  const bcrypt = require('bcrypt');
  const { nombre, email, password, rol = 'mayorista', telefono, direccion } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ error: 'Faltan campos obligatorios' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, direccion) VALUES (?,?,?,?,?,?)',
      [nombre, email, hash, rol, telefono || null, direccion || null]
    );
    res.status(201).json({ id: result.insertId, nombre, email, rol });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El email ya existe' });
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// ---- 404 + error handler ----
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Error interno' }); });

app.listen(PORT, () => console.log(`🔥 Flama Backend en puerto ${PORT}`));
module.exports = app;