import { Router } from "express";
import { body } from "express-validator";
import { upload } from "../middleware/upload.js";
import { register, login, refresh, logout } from "../controllers/auth.controller.js";
import rateLimit from "express-rate-limit";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: "Demasiados intentos, intente más tarde" },
});

router.post(
  "/register",
  upload.single("photo"),
  [
    body("name").isLength({ min: 2 }),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
  ],
  register
);

router.post("/login", loginLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
