import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import couponRoutes from "./routes/coupon.routes.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { ensureBucket } from "./config/minio.js";
import productsRoutes from "./routes/products.routes.js";
import commentsRoutes from "./routes/comments.routes.js";
import checkoutRoutes from "./routes/checkout.routes.js";
import ordersRoutes from "./routes/orders.routes.js";
import mediaRoutes from "./routes/media.routes.js";

const app = express();

// CORS configurado de forma segura
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  exposedHeaders: ['Content-Type', 'Content-Length'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 600 // 10 minutos
}));

// Helmet con configuración segura para manejo de imágenes
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'"], // Solo desde el mismo origen
      imgSrc: ["'self'", "data:", "https:", "http:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
  hidePoweredBy: true, // Ocultar header X-Powered-By
  frameguard: { action: 'deny' }, // Prevenir clickjacking
  dnsPrefetchControl: { allow: false }, // Desactivar DNS prefetching
  ieNoOpen: true, // Para IE8+
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
}));

// Logging en modo desarrollo
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: '10mb' })); // Limitar tamaño de JSON

// ============================================
// RATE LIMITING - Protección contra fuerza bruta y DDoS
// ============================================

// Rate limiter general para toda la API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana por IP
  message: {
    error: "Demasiadas solicitudes desde esta IP, por favor intenta más tarde."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Confiar en proxy para obtener IP real (importante en producción con nginx/load balancer)
  trustProxy: process.env.NODE_ENV === "production",
});

// Rate limiter estricto para autenticación (prevenir fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Solo 5 intentos de login
  skipSuccessfulRequests: true, // No contar requests exitosos
  message: {
    error: "Demasiados intentos de autenticación. Cuenta bloqueada temporalmente.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: process.env.NODE_ENV === "production",
});

// Rate limiter para registro (prevenir spam de cuentas)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Solo 3 registros por hora por IP
  message: {
    error: "Demasiados intentos de registro. Por favor intenta más tarde.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: process.env.NODE_ENV === "production",
});

// Rate limiter para creación de contenido (prevenir spam)
const createContentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 comentarios/productos por minuto
  message: {
    error: "Estás creando contenido demasiado rápido. Por favor espera un momento.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: process.env.NODE_ENV === "production",
});

// Aplicar rate limiter general a toda la API
app.use('/api/', generalLimiter);

// Headers de seguridad adicionales
app.use((req, res, next) => {
  // Prevenir MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Habilitar protección XSS del navegador
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // HSTS - Forzar HTTPS (solo en producción)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (antes Feature Policy)
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );
  
  // No revelar información del servidor
  res.removeHeader('X-Powered-By');
  
  // Prevenir DNS prefetching
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  
  // Prevenir download de archivos que no son del mismo origen
  res.setHeader('X-Download-Options', 'noopen');
  
  // Cross-Domain Policies
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  next();
});

// inicializar bucket
ensureBucket().catch((err) => {
  process.exit(1);
});

// rutas con rate limiting específico
app.use("/api/auth/login", authLimiter); // Proteger login
app.use("/api/auth/register", registerLimiter); // Proteger registro
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/comments", createContentLimiter, commentsRoutes); // Proteger comentarios
app.use("/api/checkout", checkoutRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/media", mediaRoutes);

app.get("/", (req, res) => res.json({ message: "Arepabuelas API segura 🧤" }));

// Manejo de errores global
app.use((err, req, res, next) => {
  // Errores de multer
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Archivo demasiado grande. Máximo 2MB' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Demasiados archivos' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Campo de archivo inesperado' });
    }
    return res.status(400).json({ error: 'Error al subir archivo' });
  }
  
  // Otros errores
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Ruta 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend en puerto ${PORT}`);
});