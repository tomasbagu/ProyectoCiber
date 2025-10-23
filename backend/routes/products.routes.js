import { Router } from "express";
import { body, param } from "express-validator";
import { authRequired, adminOnly } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.js";
import * as productController from "../controllers/product.controller.js";

const router = Router();

router.get("/", productController.listProducts);
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
