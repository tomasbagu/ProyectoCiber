import { Router } from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";
import { authRequired } from "../middleware/auth.middleware.js";
import * as checkoutController from "../controllers/checkout.controller.js";

const router = Router();
const checkoutLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: "Demasiadas solicitudes al checkout" } });

router.post("/", authRequired, checkoutLimiter, [
  body("items").isArray({ min: 1 }),
  body("items.*.productId").isInt(),
  body("items.*.quantity").isInt({ min: 1 }),
  body("payment.cardNumber").isString(),
  body("payment.exp_month").isInt({ min: 1, max: 12 }),
  body("payment.exp_year").isInt({ min: 2024 }),
  body("coupon").optional().isString()
], checkoutController.checkout);

export default router;
