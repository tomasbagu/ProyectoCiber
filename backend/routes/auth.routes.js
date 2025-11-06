import { Router } from "express";
import { body } from "express-validator";
import { upload, validateImageContent } from "../middleware/upload.js";
import { register, login, refresh, logout, logoutAll } from "../controllers/auth.controller.js";
import { authRequired } from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiters para prevenir abuso
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 8, // 8 intentos
  message: { error: "Demasiados intentos de inicio de sesión, intente más tarde" },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 registros por hora
  message: { error: "Demasiados registros, intente más tarde" },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // 20 refreshes cada 15 minutos
  message: { error: "Demasiadas solicitudes de actualización de token" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validadores de contraseña mejorados
const passwordValidator = body("password")
  .isLength({ min: 8, max: 128 })
  .withMessage("La contraseña debe tener entre 8 y 128 caracteres")
  .matches(/[a-z]/)
  .withMessage("Debe contener al menos una letra minúscula")
  .matches(/[A-Z]/)
  .withMessage("Debe contener al menos una letra mayúscula")
  .matches(/[0-9]/)
  .withMessage("Debe contener al menos un número")
  .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
  .withMessage("Debe contener al menos un carácter especial");

router.post(
  "/register",
  uploadLimiter,
  upload.single("photo"),
  validateImageContent,
  [
    body("name")
      .isLength({ min: 2, max: 100 })
      .trim()
      .escape()
      .withMessage("El nombre debe tener entre 2 y 100 caracteres"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 255 })
      .withMessage("Email inválido"),
    passwordValidator,
  ],
  register
);

router.post("/login", loginLimiter, login);

router.post("/refresh", refreshLimiter, refresh);

router.post("/logout", logout);

router.post("/logout-all", authRequired, logoutAll);

export default router;
