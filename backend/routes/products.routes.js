import { Router } from "express";
import { body, param } from "express-validator";
import { authRequired, adminOnly } from "../middleware/auth.middleware.js";
import { upload, validateImageContent } from "../middleware/upload.js";
import * as productController from "../controllers/product.controller.js";

const router = Router();

router.get("/", productController.listProducts);
router.get("/:id", param("id").isInt(), productController.getProduct);

router.post(
  "/",
  authRequired,
  adminOnly,
  upload.single("image"),
  validateImageContent,
  [
    body("name").isLength({ min: 2 }).trim().escape(),
    body("price_cents").isInt({ min: 0 }),
    body("description").optional().isString().trim(),
  ],
  productController.createProduct
);

router.put(
  "/:id",
  authRequired,
  adminOnly,
  upload.single("image"),
  validateImageContent,
  [
    param("id").isInt(),
    body("name").isLength({ min: 2 }).trim().escape(),
    body("price_cents").isInt({ min: 0 }),
    body("description").optional().isString().trim(),
  ],
  productController.updateProduct
);

router.delete(
  "/:id",
  authRequired,
  adminOnly,
  param("id").isInt(),
  productController.deleteProduct
);

export default router;
