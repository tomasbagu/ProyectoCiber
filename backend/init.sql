-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla users (primero porque otras dependen de ella)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'pending',
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla productos
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla comentarios por producto
CREATE TABLE IF NOT EXISTS product_comments (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  rating SMALLINT CHECK (rating>=1 AND rating<=5),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla cupones
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_percent SMALLINT CHECK (discount_percent>=1 AND discount_percent<=100),
  amount_cents INTEGER CHECK (amount_cents >= 0),
  expires_at TIMESTAMP,
  usage_limit INTEGER DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla órdenes
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  coupon_id INTEGER REFERENCES coupons(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla items de órdenes
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla tokens de pago (encriptados)
CREATE TABLE IF NOT EXISTS payment_tokens (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  provider_token TEXT NOT NULL,
  brand VARCHAR(50),
  last4 CHAR(4),
  exp_month SMALLINT,
  exp_year SMALLINT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla registro de uso de cupones
CREATE TABLE IF NOT EXISTS coupon_usages (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER REFERENCES coupons(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar usuario admin
-- Password: admin123 (en producción cambiar!)
-- Hash generado con Argon2
INSERT INTO users (name, email, password_hash, role, photo_url) 
VALUES (
  'Administrador',
  'admin@arepabuelas.com',
  '$argon2id$v=19$m=65536,t=3,p=1$fSOZKzPisEuV8a5weIGbHA$WIjMqmYr/wxhu+7ED8UjH1xXkKDV/rOcFXRIQUUMaQc',
  'admin',
  'https://ui-avatars.com/api/?name=Admin&background=4F46E5&color=fff&size=200'
) ON CONFLICT (email) DO NOTHING;

-- Insertar cupón de bienvenida
INSERT INTO coupons (code, discount_percent, expires_at, usage_limit, usage_count) 
VALUES (
  'AREPABUELA10',
  10,
  NULL,
  NULL,
  0
) ON CONFLICT (code) DO NOTHING;

-- Insertar productos iniciales con imágenes
INSERT INTO products (name, description, price_cents, image_url) VALUES
(
  'Arepa de Queso',
  'Deliciosa arepa rellena de queso blanco fresco. Un clásico venezolano que no puede faltar en tu mesa.',
  450000,
  'https://imag.bonviveur.com/arepas-colombianas-con-queso-partidas.jpg'
),
(
  'Arepa Reina Pepiada',
  'Arepa rellena con ensalada de pollo, aguacate y mayonesa. El sabor tradicional que conquistó al mundo.',
  650000,
  'https://d2j9trpqxd6hrn.cloudfront.net/uploads/recipe/picture/151/IMG_8303-500.jpg'
),
(
  'Arepa Pabellón',
  'Arepa completa con carne mechada, caraotas negras, tajadas de plátano maduro y queso rallado. Un festival de sabores.',
  850000,
  'https://comidasvenezolanas.org/assets/images/arepa-pabellon_800x534.webp'
),
(
  'Arepa Domino',
  'Arepa rellena con caraotas negras y queso blanco rallado. Simple, deliciosa y nutritiva.',
  550000,
  'https://theworldinrecipes.s3.amazonaws.com/uploads/recipe/picture/930/arepa_3.jpg'
),
(
  'Arepa Pelua',
  'Arepa con carne mechada jugosa y queso amarillo gratinado. Una explosión de sabor en cada bocado.',
  750000,
  'https://i0.wp.com/norkaluque.net/wp-content/uploads/2021/09/arepa-pelua.jpg'
) ON CONFLICT DO NOTHING;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Base de datos inicializada correctamente';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Usuario admin: admin@arepabuelas.com / admin123';
  RAISE NOTICE 'Cupón bienvenida: AREPABUELA10 (10%% descuento)';
  RAISE NOTICE '5 productos insertados con éxito';
  RAISE NOTICE '==============================================';
END $$;
