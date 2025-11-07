// src/routes/comments.routes.js
import { Router } from "express";
import { body, param } from "express-validator";
import { authRequired } from "../middleware/auth.middleware.js";
import { rateLimiter } from "../middleware/rateLimiter.middleware.js";
import * as commentController from "../controllers/comment.controller.js";

const router = Router();

router.post("/:productId", rateLimiter, authRequired, [param("productId").isInt(), body("content").isLength({ min: 1, max: 1000 }), body("rating").optional().isInt({ min: 1, max: 5 })], commentController.addComment);
router.post("/:productId", authRequired, [param("productId").isInt(), body("content").isLength({ min: 1, max: 1000 }), body("rating").optional().isInt({ min: 1, max: 5 })], commentController.addComment);

export default router;
