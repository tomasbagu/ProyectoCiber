import { Router } from "express";
import { param } from "express-validator";
import { authRequired, adminOnly } from "../middleware/auth.middleware.js";
import { rateLimiter } from "../middleware/rateLimiter.middleware.js";
import * as orderController from "../controllers/order.controller.js";

const router = Router();



router.get("/my-orders", authRequired, orderController.getUserOrders);

// Obtener detalle de una orden específica (usuario ve sus órdenes, admin ve todas)
router.get("/:id", authRequired, param("id").isInt(), orderController.getOrderById);


router.get("/", rateLimiter, authRequired, adminOnly, orderController.getAllOrders);
router.get("/", authRequired, adminOnly, orderController.getAllOrders);

export default router;
