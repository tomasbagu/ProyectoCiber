// src/controllers/auth.controller.js
import { validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { minioClient, BUCKET } from "../config/minio.js";
import { createUser, findByEmail, verifyPassword } from "../models/user.model.js";
import { signAccessToken } from "../utils/jwt.js";
import * as tokenModel from "../models/token.model.js";
import sanitizeHtml from "sanitize-html";

const REFRESH_TTL_DAYS = parseInt(process.env.REFRESH_TTL_DAYS || "30", 10);

function nowPlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, email, password } = req.body;

    const existing = await findByEmail(email);
    if (existing) return res.status(400).json({ error: "Correo ya registrado" });

    // Subida foto opcional
    let photoUrl = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const filename = `${uuidv4()}${ext}`;
      await minioClient.putObject(BUCKET, filename, req.file.buffer, req.file.size, {
        "Content-Type": req.file.mimetype,
      });
      // Genera URL presignada (lectura por 24h)
      photoUrl = await minioClient.presignedGetObject(BUCKET, filename, 24 * 60 * 60);
    }

    // sanitize name (no html)
    const cleanName = sanitizeHtml(name, { allowedTags: [], allowedAttributes: {} }).trim();

    const user = await createUser({
      name: cleanName,
      email: email.toLowerCase(),
      password,
      photo_url: photoUrl,
    });

    return res.status(201).json({
      message: "Usuario creado. Pendiente de aprobación por admin.",
      user,
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "Error en el registro" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await findByEmail(email.toLowerCase());
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    if (user.role === "pending") return res.status(403).json({ error: "Cuenta pendiente de aprobación" });

    // Payload con claims mínimas
    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);

    // Refresh token: UUID
    const refreshToken = uuidv4();
    const expiresAt = nowPlusDays(REFRESH_TTL_DAYS);
    await tokenModel.storeRefreshToken({ userId: user.id, token: refreshToken, expiresAt });

    return res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, photo_url: user.photo_url },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Error en login" });
  }
}

export async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "Refresh token requerido" });

    const record = await tokenModel.findRefreshToken(refreshToken);
    if (!record) return res.status(401).json({ error: "Refresh token inválido" });

    if (new Date(record.expires_at) < new Date()) {
      await tokenModel.deleteRefreshToken(refreshToken);
      return res.status(401).json({ error: "Refresh token expirado" });
    }

    // obtener user
    const userRes = await (await import("../models/user.model.js")).findById(record.user_id);
    if (!userRes) {
      await tokenModel.deleteRefreshToken(refreshToken);
      return res.status(401).json({ error: "Usuario asociado no existe" });
    }

    // rotación: eliminar refresh token viejo y crear nuevo
    await tokenModel.deleteRefreshToken(refreshToken);
    const newRefresh = uuidv4();
    const expiresAt = nowPlusDays(REFRESH_TTL_DAYS);
    await tokenModel.storeRefreshToken({ userId: userRes.id, token: newRefresh, expiresAt });

    const accessToken = signAccessToken({ id: userRes.id, email: userRes.email, role: userRes.role });

    return res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) {
    console.error("refresh error:", err);
    return res.status(500).json({ error: "Error en refresh token" });
  }
}

export async function logout(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "Refresh token requerido" });
    await tokenModel.deleteRefreshToken(refreshToken);
    return res.json({ message: "Sesión cerrada" });
  } catch (err) {
    console.error("logout error:", err);
    return res.status(500).json({ error: "Error en logout" });
  }
}
