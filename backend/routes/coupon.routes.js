import { Router } from "express";
import * as couponModel from "../models/coupon.model.js";

const router = Router();

router.post("/validate", async (req, res) => {
  const { code } = req.body;

  if (!code) return res.status(400).json({ error: "Código de cupón requerido" });

  try {
    const coupon = await couponModel.findCouponByCode(code.trim().toUpperCase());
    if (!coupon) return res.status(404).json({ error: "Cupón no encontrado" });

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
      return res.status(400).json({ error: "El cupón ha expirado" });

    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit)
      return res.status(400).json({ error: "El cupón ha alcanzado su límite de uso" });

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
