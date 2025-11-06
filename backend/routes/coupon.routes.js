import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as couponModel from "../models/coupon.model.js";
import { authRequired } from "../middleware/auth.middleware.js";

const router = Router();

// Rate limiting para prevenir brute force de códigos de cupón
const couponValidateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos por usuario
  message: { error: "Demasiados intentos de validación. Intenta nuevamente en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/validate", authRequired, couponValidateLimiter, async (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;

  if (!code) return res.status(400).json({ error: "Código de cupón requerido" });

  try {
    const coupon = await couponModel.findCouponByCode(code.trim().toUpperCase());
    if (!coupon) return res.status(404).json({ error: "Cupón no encontrado" });

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
      return res.status(400).json({ error: "El cupón ha expirado" });

    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit)
      return res.status(400).json({ error: "El cupón ha alcanzado su límite de uso" });

    // ✅ Verificar si el usuario ya usó este cupón
    const alreadyUsed = await couponModel.checkUserCouponUsage(coupon.id, userId);
    if (alreadyUsed) {
      return res.status(400).json({ error: "Ya has usado este cupón anteriormente" });
    }

    // ✅ Respuesta solo con lo necesario
    res.json({
      code: coupon.code,
      discount_percent: coupon.discount_percent || 0,
      amount_cents: coupon.amount_cents || 0,
    });
  } catch (err) {
    console.error("Error validando cupón:", err);
    res.status(500).json({ error: "Error interno al validar cupón" });
  }
});

export default router;
