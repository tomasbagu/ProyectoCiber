import { Router } from "express";
import { body, param } from "express-validator";
import { authRequired, adminOnly } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.js";
import * as productController from "../controllers/product.controller.js";
import rateLimit from "express-rate-limit";

const createProductLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many requests, please try again later"
});

const router = Router();

router.get("/:id", param("id").isInt(), productController.getProduct);

router.post(
  "/",
  authRequired,
  adminOnly,
  upload.single("image"),
  [
    body("name").isLength({ min: 2 }),
    body("price_cents").isInt({ min: 0 }),
    body("description").optional().isString(),
  ],
  productController.createProduct
);

export default router;
