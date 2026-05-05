// ============================================================
//  FLAMA DISTRIBUIDORA — routes/productos.js
//  GET /api/productos        → todos los productos con precios
//  GET /api/productos/mayor  → solo precio mayorista
//  GET /api/productos/menor  → solo precio minorista
//  PUT /api/productos/:id/precio → actualizar precio (admin)
// ============================================================

const router = require('express').Router();
const db     = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

// ── GET /api/productos ──────────────────────────────────────
// Devuelve todos los productos con precio mayorista y minorista
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        a.id,
        a.codigo,
        a.nombre,
        f.nombre        AS categoria,
        a.imagen_url    AS img,
        a.unidades_caja AS unidCaja,
        a.compra_minima AS minCompra,
        pm.precio       AS priceMayor,
        pn.precio       AS priceMinor,
        s.cantidad      AS stock
      FROM articulos a
      JOIN familias f          ON f.id = a.familia_id
      LEFT JOIN precios pm     ON pm.articulo_id = a.id AND pm.lista = 'mayorista' AND pm.activo = 1
      LEFT JOIN precios pn     ON pn.articulo_id = a.id AND pn.lista = 'minorista' AND pn.activo = 1
      LEFT JOIN stock s        ON s.articulo_id = a.id
      WHERE a.activo = 1
      ORDER BY f.nombre, a.nombre
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// ── PUT /api/productos/:id/precio ───────────────────────────
// Actualizar precio de un producto (solo admin)
router.put('/:id/precio', verifyToken, requireRole('admin'), async (req, res) => {
  const { lista, precio } = req.body; // lista: 'mayorista' | 'minorista'
  if (!lista || !precio) return res.status(400).json({ error: 'Faltan campos' });
  if (!['mayorista','minorista'].includes(lista)) return res.status(400).json({ error: 'Lista inválida' });

  try {
    await db.query(
      'UPDATE precios SET precio = ?, vigente_desde = CURDATE() WHERE articulo_id = ? AND lista = ? AND activo = 1',
      [precio, req.params.id, lista]
    );
    res.json({ ok: true, articulo_id: req.params.id, lista, precio });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar precio' });
  }
});

// ── PUT /api/productos/precios/bulk ─────────────────────────
// Actualizar múltiples precios a la vez (admin)
router.put('/precios/bulk', verifyToken, requireRole('admin'), async (req, res) => {
  const { updates } = req.body; // [{id, lista, precio}]
  if (!Array.isArray(updates) || !updates.length) return res.status(400).json({ error: 'Sin datos' });

  try {
    let count = 0;
    for (const u of updates) {
      await db.query(
        'UPDATE precios SET precio = ?, vigente_desde = CURDATE() WHERE articulo_id = ? AND lista = ? AND activo = 1',
        [u.precio, u.id, u.lista]
      );
      count++;
    }
    res.json({ ok: true, updated: count });
  } catch (err) {
    res.status(500).json({ error: 'Error en bulk update' });
  }
});

module.exports = router;
