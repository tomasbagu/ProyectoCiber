import { Router } from "express";
import { param } from "express-validator";
import { authRequired, adminOnly } from "../middleware/auth.middleware.js";
import * as orderController from "../controllers/order.controller.js";

const router = Router();

// Obtener historial de compras del usuario autenticado
router.get("/my-orders", authRequired, orderController.getUserOrders);

// Obtener detalle de una orden específica (usuario ve sus órdenes, admin ve todas)
router.get("/:id", authRequired, param("id").isInt(), orderController.getOrderById);

// Obtener todas las órdenes (solo admin)
router.get("/", authRequired, adminOnly, orderController.getAllOrders);

export default router;
