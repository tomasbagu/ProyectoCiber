import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

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
      imgSrc: ["'self'", "data:", "https:", "http:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
}));

// Logging en modo desarrollo
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: '10mb' })); // Limitar tamaño de JSON

// Headers de seguridad adicionales
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// inicializar bucket
ensureBucket().catch((err) => {
  process.exit(1);
});

// rutas
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/comments", commentsRoutes);
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