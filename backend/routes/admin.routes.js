import { Router } from "express";
import { authRequired, adminOnly } from "../middleware/auth.middleware.js";
import pool from "../config/db.js";
import rateLimit from "express-rate-limit";

const approveUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: "Demasiadas solicitudes, intente más tarde"
});

const router = Router();

// Obtener usuarios pendientes
router.get("/pending-users", authRequired, adminOnly, approveUserLimiter, async (req, res) => {
  const result = await pool.query("SELECT id, name, email, created_at FROM users WHERE role = 'pending' ORDER BY created_at DESC");
  res.json(result.rows);
});

// Aprobar usuario
router.post("/approve/:id", authRequired, adminOnly, approveUserLimiter, async (req, res) => {
  const { id } = req.params;
  await pool.query("UPDATE users SET role = 'user' WHERE id = $1", [id]);
  res.json({ message: "Usuario aprobado" });
});

export default router;
