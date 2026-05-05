# 🔥 Flama Distribuidora — Backend

API de autenticación para el portal mayorista. Node.js + Express + MySQL + JWT.

---

## Estructura

```
flama-backend/
├── server.js          ← Punto de entrada
├── db.js              ← Conexión MySQL
├── seed.js            ← Crea usuarios iniciales
├── package.json
├── .env.example       ← Copiá como .env y completá
├── routes/
│   └── auth.js        ← POST /auth/login, /auth/refresh, etc.
├── middleware/
│   └── auth.js        ← verifyToken, requireRole
└── login-modal.html   ← Snippet para integrar al HTML mayorista
```

---

## Instalación local

```bash
# 1. Clonar / descomprimir
cd flama-backend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editá .env con tus datos de MySQL

# 4. Crear la base de datos (si no la tenés)
# Ejecutá el script flama_db.sql en MySQL Workbench o:
mysql -u root -p < ../flama_db.sql

# 5. Crear usuarios iniciales
node seed.js

# 6. Arrancar el servidor
npm run dev      # desarrollo (nodemon)
npm start        # producción
```

---

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | /health | ❌ | Estado del servidor |
| POST | /auth/login | ❌ | Login con email + password |
| POST | /auth/refresh | ❌ | Renovar token |
| POST | /auth/logout | ❌ | Logout (limpia cliente) |
| POST | /auth/change-password | ✅ | Cambiar contraseña |
| GET | /me | ✅ | Datos del usuario logueado |
| GET | /admin/usuarios | ✅ Admin | Listar todos los usuarios |
| POST | /admin/usuarios | ✅ Admin | Crear usuario mayorista |
| PUT | /admin/usuarios/:id/toggle | ✅ Admin | Activar/desactivar usuario |

---

## Deploy en Railway (gratis)

1. Creá cuenta en railway.app
2. "New Project" → "Deploy from GitHub repo"
3. Subí esta carpeta a un repositorio GitHub
4. Railway detecta Node.js automáticamente
5. En "Variables" cargá todos los valores del .env
6. Railway te da una URL como: `https://flama-backend-xxx.railway.app`
7. Copiá esa URL en `login-modal.html` donde dice `API_URL`

### MySQL en Railway
1. En el mismo proyecto → "Add Service" → "MySQL"
2. Railway genera automáticamente DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
3. Usá esas variables en el .env

---

## Usuarios demo (para probar sin backend)

El modal tiene un modo demo que funciona sin backend:

| Email | Password | Rol |
|-------|----------|-----|
| admin@flamadistri.ar | Flama2024! | admin |
| mayorista@demo.com | Demo1234! | mayorista |

---

## Seguridad implementada

- ✅ Contraseñas hasheadas con bcrypt (cost factor 12)
- ✅ JWT con expiración (7 días access, 30 días refresh)
- ✅ Rate limiting: máx 10 intentos de login por 15 min por IP
- ✅ Helmet (headers de seguridad HTTP)
- ✅ CORS configurado por dominio
- ✅ Mismo mensaje de error para email no encontrado y contraseña incorrecta (anti-enumeración)
- ✅ Validación de rol al login (solo admin y mayorista)

---

## Integrar el modal al HTML mayorista

1. Abrí `login-modal.html`
2. Copiá el bloque `<!-- CSS -->` dentro de `<style>` en tu HTML
3. Copiá el bloque `<!-- HTML -->` antes del `</body>`
4. Copiá el bloque `<!-- JS -->` dentro de `<script>`
5. Reemplazá `showLoginComingSoon()` por `openLoginModal()` en el botón del header
6. Cuando tengas el backend en Railway, reemplazá `API_URL` con tu URL real

El modal funciona en **modo demo** sin backend — ideal para seguir desarrollando.
