# Arepabuelas - E-commerce Seguro 🧤

Sistema de e-commerce con enfoque en seguridad desarrollado con Node.js, PostgreSQL y MinIO.

## 🚀 Configuración inicial

### 1. Clonar el repositorio
```bash
git clone <tu-repo>
cd arepabuelas
```

### 2. Configurar variables de entorno
Copia el archivo de ejemplo y configura tus propios valores:

```bash
cp .env.example .env
```

Edita el archivo `.env` y actualiza los siguientes valores **IMPORTANTES**:

#### Generar JWT_SECRET seguro:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Generar ENCRYPTION_KEY seguro:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Iniciar los contenedores
```bash
docker compose up -d
```

La base de datos se inicializará automáticamente con:
- ✅ Todas las tablas necesarias
- ✅ Usuario admin: `admin@arepabuelas.com` / `admin123`
- ✅ Cupón de bienvenida: `AREPABUELA10` (10% descuento)
- ✅ 5 productos de ejemplo con imágenes

### 4. Verificar que todo está corriendo
```bash
docker compose ps
```

Deberías ver 4 contenedores:
- `arepabuelas_db` (PostgreSQL)
- `arepabuelas_minio` (MinIO)
- `arepabuelas_backend` (API Node.js)
- `arepabuelas_frontend` (React + Vite)

## 📦 Servicios y Endpoints

### Servicios:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **MinIO Console**: http://localhost:9001

### API Endpoints:

#### Autenticación (`/api/auth`)
- `POST /api/auth/register` - Registrar usuario (multipart/form-data con foto)
- `POST /api/auth/login` - Iniciar sesión (rate limit: 8 intentos/15min)
- `POST /api/auth/refresh` - Refrescar token
- `POST /api/auth/logout` - Cerrar sesión

#### Productos (`/api/products`) - Rate limit: 30 req/min
- `GET /api/products` - Listar productos (público)
- `GET /api/products/:id` - Ver producto (público)
- `POST /api/products` - Crear producto (admin, multipart/form-data)

#### Comentarios (`/api/comments`)
- `GET /api/comments/:productId` - Ver comentarios (público)
- `POST /api/comments/:productId` - Agregar comentario (requiere auth)

#### Checkout (`/api/checkout`) - Rate limit: 10 req/min
- `POST /api/checkout` - Procesar compra (requiere auth)

#### Órdenes (`/api/orders`)
- `GET /api/orders/my-orders` - Ver mis órdenes (requiere auth)
- `GET /api/orders/:id` - Ver detalle de orden (requiere auth)
- `GET /api/orders` - Ver todas las órdenes (solo admin)

#### Admin (`/api/admin`)
- `GET /api/admin/pending-users` - Ver usuarios pendientes (solo admin)
- `POST /api/admin/approve/:id` - Aprobar usuario (solo admin)

## 📋 Datos de ejemplo

### Usuario Admin
- **Email**: `admin@arepabuelas.com`
- **Password**: `admin123`
- **Rol**: admin

### Cupón de Bienvenida
- **Código**: `AREPABUELA10`
- **Descuento**: 10%
- **Uso**: Una vez por usuario
- **Límite**: Ilimitado (todos los usuarios pueden usarlo)

### Productos Iniciales
1. Arepa de Queso - $4.500
2. Arepa Reina Pepiada - $6.500
3. Arepa Pabellón - $8.500
4. Arepa Domino - $5.500
5. Arepa Pelua - $7.500

## 🔒 Características de seguridad

- ✅ **Rate limiting** en endpoints sensibles
- ✅ **Validación de tarjetas** con algoritmo de Luhn
- ✅ **Encriptación** de tokens de pago
- ✅ **JWT** para autenticación (access + refresh tokens)
- ✅ **Argon2** para hash de contraseñas
- ✅ **Sanitización de HTML** en inputs
- ✅ **Helmet.js** para headers de seguridad
- ✅ **CORS** configurado
- ✅ **Transacciones** de base de datos
- ✅ **Validación de inputs** con express-validator
- ✅ **Almacenamiento seguro** de archivos con MinIO
- ✅ **Variables de entorno** para secretos

## 🛠️ Comandos útiles

### Ver logs:
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### Acceder a la base de datos:
```bash
docker exec -it arepabuelas_db psql -U arepauser -d arepabuelas
```

### Reiniciar servicios:
```bash
docker compose restart
```

### Reconstruir contenedores:
```bash
docker compose up --build -d
```

### Detener todo:
```bash
docker compose down
```

### Limpiar todo (incluyendo volúmenes):
```bash
docker compose down -v
```

## 🔧 Desarrollo

### Estructura del proyecto:
```
arepabuelas/
├── backend/
│   ├── config/          # Configuración DB y MinIO
│   ├── controllers/     # Lógica de negocio
│   ├── middleware/      # Auth y upload
│   ├── models/          # Modelos de datos
│   ├── routes/          # Rutas de la API
│   ├── utils/           # Utilidades (crypto, jwt, payment)
│   ├── init.sql         # Script de inicialización DB
│   └── index.js         # Punto de entrada
├── frontend/
│   └── src/
├── .env                 # Variables de entorno (NO COMMITEAR)
├── .env.example         # Plantilla de variables
└── docker-compose.yml   # Configuración Docker
```

### Regenerar hash de contraseña admin:
```bash
cd backend
node generate-hash.js
```
Luego actualiza el hash en `init.sql` y reinicia la DB:
```bash
docker compose down -v
docker compose up -d
```

## 🧪 Testing de Pagos

Para probar pagos, usa números de tarjeta que pasen el algoritmo de Luhn:
- `4532015112830366` (Visa)
- `5425233430109903` (Mastercard)
- `371449635398431` (American Express)
- `6011000990139424` (Discover)

## 📝 Notas importantes

- **NO COMMITEAR** el archivo `.env` al repositorio
- Cambiar todas las claves por defecto en producción
- Los usuarios nuevos se registran con rol `pending` y requieren aprobación de admin
- El cupón de bienvenida es de un solo uso por usuario
- Los precios están en centavos (450000 = $4.500)
- Las imágenes de productos usan URLs de Unsplash como placeholder

## ⚠️ Seguridad en Producción

Antes de desplegar a producción:

1. **Cambiar contraseña del admin**
2. **Generar nuevos secretos** (JWT_SECRET, ENCRYPTION_KEY)
3. **Usar contraseñas fuertes** para DB y MinIO
4. **Configurar HTTPS** (certificados SSL/TLS)
5. **Configurar CORS** con dominios específicos
6. **Habilitar backups** de la base de datos
7. **Monitorear logs** y métricas
8. **Implementar 2FA** para usuarios admin

## 📄 Licencia

Este proyecto es solo para fines educativos en ciberseguridad.
