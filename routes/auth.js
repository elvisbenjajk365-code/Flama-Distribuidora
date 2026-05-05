// ============================================================
//  FLAMA DISTRIBUIDORA — routes/auth.js
//  POST /auth/login
//  POST /auth/refresh
//  POST /auth/logout
//  POST /auth/change-password
// ============================================================

const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');

const JWT_SECRET          = process.env.JWT_SECRET  || 'flama_secret_cambiar_en_produccion';
const JWT_EXPIRES         = process.env.JWT_EXPIRES || '7d';
const REFRESH_EXPIRES     = '30d';

// ---- Helper: generar tokens ----
function generateTokens(user) {
  const payload = { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre };
  const access  = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const refresh = jwt.sign({ id: user.id }, JWT_SECRET + '_refresh', { expiresIn: REFRESH_EXPIRES });
  return { access, refresh };
}

// ============================================================
//  POST /auth/login
//  Body: { email, password }
//  Returns: { token, refresh_token, user }
// ============================================================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validación básica
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    // Buscar usuario
    const [rows] = await db.query(
      'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    // No existe
    if (!rows.length) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Existe pero está pendiente de aprobación
    if (!rows[0].activo) {
      return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación. Te avisamos por mail cuando esté lista.' });
    }

    const user = rows[0];

    // Verificar contraseña
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Solo mayoristas y admins pueden entrar al portal mayorista
    if (!['admin', 'mayorista'].includes(user.rol)) {
      return res.status(403).json({ error: 'Sin acceso al portal mayorista' });
    }

    // Generar tokens
    const { access, refresh } = generateTokens(user);

    // Log de acceso (opcional)
    await db.query(
      'UPDATE usuarios SET actualizado_en = NOW() WHERE id = ?',
      [user.id]
    );

    res.json({
      token:         access,
      refresh_token: refresh,
      user: {
        id:     user.id,
        nombre: user.nombre,
        email:  user.email,
        rol:    user.rol,
      },
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================
//  POST /auth/refresh
//  Body: { refresh_token }
//  Returns: { token }
// ============================================================
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'Refresh token requerido' });

  try {
    const decoded = jwt.verify(refresh_token, JWT_SECRET + '_refresh');

    const [rows] = await db.query(
      'SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = ?',
      [decoded.id]
    );

    if (!rows.length || !rows[0].activo) {
      return res.status(401).json({ error: 'Usuario no válido' });
    }

    const { access } = generateTokens(rows[0]);
    res.json({ token: access });

  } catch (err) {
    res.status(401).json({ error: 'Refresh token inválido o expirado' });
  }
});

// ============================================================
//  POST /auth/logout
//  (Con JWT stateless solo borramos del cliente)
// ============================================================
router.post('/logout', (req, res) => {
  res.json({ message: 'Sesión cerrada correctamente' });
});

// ============================================================
//  POST /auth/change-password  (requiere estar logueado)
//  Body: { current_password, new_password }
// ============================================================
router.post('/change-password', verifyToken, async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Faltan campos' });
  }

  if (new_password.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const [rows] = await db.query(
      'SELECT password_hash FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, req.user.id]);

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

module.exports = router;

// ============================================================
//  POST /auth/register
//  Body: { nombre, email, password, rol, telefono, localidad,
//          direccion, cuit, tipo_doc, nombre_negocio, tipo_negocio }
//  Crea usuario con activo=0 (pendiente de aprobación)
// ============================================================
router.post('/register', async (req, res) => {
  const {
    nombre, email, password, rol = 'mayorista',
    telefono, localidad, direccion,
    cuit, tipo_doc, nombre_negocio, tipo_negocio
  } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  const cuitClean = (cuit || '').replace(/\D/g, '');
  if (!cuitClean || cuitClean.length !== 11) {
    return res.status(400).json({ error: 'CUIT/CUIL inválido' });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    await db.query(
      `INSERT INTO usuarios
        (nombre, email, password_hash, rol, telefono, localidad, direccion, activo)
       VALUES (?,?,?,?,?,?,?,0)`,
      [nombre, email.toLowerCase().trim(), hash, rol, telefono||null, localidad||null, direccion||null]
    );
    res.status(201).json({ message: 'Solicitud recibida. Tu cuenta está pendiente de aprobación.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});
