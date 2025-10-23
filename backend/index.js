import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";


import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { ensureBucket } from "./config/minio.js";
import productsRoutes from "./routes/products.routes.js";
import commentsRoutes from "./routes/comments.routes.js";
import checkoutRoutes from "./routes/checkout.routes.js";
import ordersRoutes from "./routes/orders.routes.js";

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

// inicializar bucket
ensureBucket().catch((err) => {
  console.error("No se pudo asegurar bucket MinIO:", err);
  process.exit(1);
});

// rutas
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/orders", ordersRoutes);

app.get("/", (req, res) => res.json({ message: "Arepabuelas API segura 🧤" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend en puerto ${PORT}`);
});