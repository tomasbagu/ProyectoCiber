// src/controllers/auth.controller.js
import { validationResult } from "express-validator";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { minioClient, BUCKET } from "../config/minio.js";
import { 
  createUser, 
  findByEmail, 
  verifyPassword,
  incrementFailedLogins,
  resetFailedLogins,
  isAccountLocked,
  getTokenVersion,
  validatePasswordStrength
} from "../models/user.model.js";
import { signAccessToken, generateRefreshToken, hashRefreshToken } from "../utils/jwt.js";
import * as tokenModel from "../models/token.model.js";
import sanitizeHtml from "sanitize-html";

const REFRESH_TTL_DAYS = parseInt(process.env.REFRESH_TTL_DAYS || "30", 10);
const MAX_SESSIONS_PER_USER = parseInt(process.env.MAX_SESSIONS_PER_USER || "5", 10);

function nowPlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Genera un nombre de archivo seguro usando UUID
 * @param {string} originalname - Nombre original del archivo
 * @returns {string} - Nombre sanitizado con UUID
 */
function generateSecureFilename(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  return `${uuidv4()}${ext}`;
}

/**
 * Valida y sanitiza la URL de la API
 * @returns {string}
 */
function getSecureApiUrl() {
  const apiUrl = process.env.API_URL || "http://localhost:4000";
  try {
    new URL(apiUrl);
    return apiUrl;
  } catch {
    return "http://localhost:4000";
  }
}

/**
 * Extrae información del cliente (IP y User-Agent) de forma segura
 * @param {Object} req - Request de Express
 * @returns {Object}
 */
function getClientInfo(req) {
  const ipAddress = (
    req.headers["x-forwarded-for"] || 
    req.headers["x-real-ip"] || 
    req.connection.remoteAddress ||
    req.socket.remoteAddress
  )?.split(",")[0]?.trim() || "unknown";

  const userAgent = (req.headers["user-agent"] || "unknown").substring(0, 500);

  return { ipAddress, userAgent };
}

export async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, email, password } = req.body;

    // Validar longitud de campos
    if (!name || name.length < 2 || name.length > 100) {
      return res.status(400).json({ error: "Nombre debe tener entre 2 y 100 caracteres" });
    }

    if (!email || email.length > 255) {
      return res.status(400).json({ error: "Email inválido" });
    }

    // Validar fortaleza de contraseña
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        error: "Contraseña no cumple requisitos de seguridad",
        details: passwordValidation.errors 
      });
    }

    const emailLower = email.toLowerCase().trim();
    const existing = await findByEmail(emailLower);
    if (existing) return res.status(400).json({ error: "Correo ya registrado" });

    // Subida foto opcional
    let photoUrl = null;
    if (req.file) {
      try {
        const { v4: uuidv4 } = await import("uuid");
        const path = await import("path");
        const ext = path.extname(req.file.originalname).toLowerCase();
        const filename = `${uuidv4()}${ext}`;
        
        await minioClient.putObject(
          BUCKET, 
          filename, 
          req.file.buffer, 
          req.file.size, 
          {
            "Content-Type": req.file.mimetype,
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff",
          }
        );
        
        const apiUrl = getSecureApiUrl();
        photoUrl = `${apiUrl}/api/media/users/${filename}`;
      } catch (uploadErr) {
        return res.status(500).json({ error: "Error subiendo foto de perfil" });
      }
    }

    // sanitize name (no html)
    const cleanName = sanitizeHtml(name, { 
      allowedTags: [], 
      allowedAttributes: {},
      disallowedTagsMode: 'discard'
    }).trim();

    if (cleanName.length < 2) {
      return res.status(400).json({ error: "Nombre inválido después de sanitización" });
    }

    const user = await createUser({
      name: cleanName,
      email: emailLower,
      password,
      photo_url: photoUrl,
    });

    // No devolver información sensible
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      photo_url: user.photo_url
    };

    return res.status(201).json({
      message: "Usuario creado. Pendiente de aprobación por admin.",
      user: safeUser,
    });
  } catch (err) {
    if (err.message && err.message.includes("contraseña")) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Error en el registro" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña requeridos" });
    }

    const emailLower = email.toLowerCase().trim();
    const user = await findByEmail(emailLower);
    
    if (!user) {
      // No revelar si el usuario existe o no
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Verificar si la cuenta está bloqueada
    const lockStatus = await isAccountLocked(user.id);
    if (lockStatus.locked) {
      const minutesLeft = Math.ceil(
        (new Date(lockStatus.until) - new Date()) / 60000
      );
      return res.status(423).json({ 
        error: `Cuenta bloqueada temporalmente. Intente en ${minutesLeft} minutos`,
        code: "ACCOUNT_LOCKED",
        lockedUntil: lockStatus.until
      });
    }

    // Verificar contraseña
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      // Incrementar contador de intentos fallidos
      const failedAttempts = await incrementFailedLogins(user.id);
      
      const attemptsLeft = 5 - failedAttempts.failed_login_attempts;
      
      if (failedAttempts.locked_until) {
        return res.status(423).json({ 
          error: "Demasiados intentos fallidos. Cuenta bloqueada temporalmente",
          code: "ACCOUNT_LOCKED",
          lockedUntil: failedAttempts.locked_until
        });
      }
      
      return res.status(401).json({ 
        error: "Credenciales inválidas",
        attemptsLeft: attemptsLeft > 0 ? attemptsLeft : undefined
      });
    }

    // Resetear intentos fallidos en login exitoso
    await resetFailedLogins(user.id);

    if (user.role === "pending") {
      return res.status(403).json({ 
        error: "Cuenta pendiente de aprobación",
        code: "PENDING_APPROVAL"
      });
    }

    // Obtener versión del token
    const tokenVersion = await getTokenVersion(user.id);

    // Generar access token
    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload, tokenVersion.toString());

    // Generar refresh token
    const { token: refreshToken, hash: tokenHash } = generateRefreshToken();
    const expiresAt = nowPlusDays(REFRESH_TTL_DAYS);
    
    // Obtener información del cliente
    const { ipAddress, userAgent } = getClientInfo(req);

    // Almacenar refresh token hasheado
    await tokenModel.storeRefreshToken({ 
      userId: user.id, 
      tokenHash, 
      expiresAt,
      userAgent,
      ipAddress
    });

    // Limitar número de sesiones activas
    await tokenModel.limitUserSessions(user.id, MAX_SESSIONS_PER_USER);

    // No devolver información sensible
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      photo_url: user.photo_url
    };

    // OWASP: Guardar refresh token en httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,      // No accesible desde JavaScript
      secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
      sameSite: 'strict',  // Protección CSRF
      maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000, // 30 días
      path: '/api/auth'    // Solo enviarlo a endpoints de auth
    });

    return res.json({
      accessToken,
      user: safeUser,
    });
  } catch (err) {
    return res.status(500).json({ error: "Error en login" });
  }
}

export async function refresh(req, res) {
  try {
    // OWASP: Leer refresh token desde httpOnly cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken || typeof refreshToken !== "string") {
      return res.status(401).json({ 
        error: "Refresh token no encontrado",
        code: "NO_REFRESH_TOKEN"
      });
    }

    // Hashear el token para buscar en BD
    const tokenHash = hashRefreshToken(refreshToken);
    const record = await tokenModel.findRefreshToken(tokenHash);
    
    if (!record) {
      return res.status(401).json({ 
        error: "Refresh token inválido",
        code: "INVALID_REFRESH_TOKEN"
      });
    }

    // Verificar expiración
    if (new Date(record.expires_at) < new Date()) {
      await tokenModel.deleteRefreshToken(tokenHash);
      return res.status(401).json({ 
        error: "Refresh token expirado",
        code: "REFRESH_TOKEN_EXPIRED"
      });
    }

    // Obtener usuario
    const { findById } = await import("../models/user.model.js");
    const userRes = await findById(record.user_id);
    
    if (!userRes) {
      await tokenModel.deleteRefreshToken(tokenHash);
      return res.status(401).json({ error: "Usuario asociado no existe" });
    }

    // Verificar que el usuario no esté bloqueado
    const lockStatus = await isAccountLocked(userRes.id);
    if (lockStatus.locked) {
      return res.status(423).json({ 
        error: "Cuenta bloqueada temporalmente",
        code: "ACCOUNT_LOCKED"
      });
    }

    // Actualizar última vez usado
    await tokenModel.updateTokenLastUsed(tokenHash);

    // Rotación de refresh token: eliminar el viejo y crear uno nuevo
    await tokenModel.deleteRefreshToken(tokenHash);
    
    const { token: newRefreshToken, hash: newTokenHash } = generateRefreshToken();
    const expiresAt = nowPlusDays(REFRESH_TTL_DAYS);
    const { ipAddress, userAgent } = getClientInfo(req);

    await tokenModel.storeRefreshToken({ 
      userId: userRes.id, 
      tokenHash: newTokenHash, 
      expiresAt,
      userAgent,
      ipAddress
    });

    // Generar nuevo access token con versión actual
    const tokenVersion = await getTokenVersion(userRes.id);
    const accessToken = signAccessToken(
      { id: userRes.id, email: userRes.email, role: userRes.role },
      tokenVersion.toString()
    );

    // OWASP: Actualizar refresh token en httpOnly cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    return res.json({ 
      accessToken
    });
  } catch (err) {
    return res.status(500).json({ error: "Error en refresh token" });
  }
}

export async function logout(req, res) {
  try {
    // OWASP: Leer refresh token desde httpOnly cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);
      await tokenModel.deleteRefreshToken(tokenHash);
    }

    // OWASP: Limpiar cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth'
    });
    
    return res.json({ message: "Sesión cerrada" });
  } catch (err) {
    return res.status(500).json({ error: "Error en logout" });
  }
}

/**
 * Cierra todas las sesiones de un usuario
 */
export async function logoutAll(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "No autenticado" });
    }

    await tokenModel.deleteAllRefreshTokensForUser(req.user.id);

    // OWASP: Limpiar cookie actual
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth'
    });
    
    return res.json({ message: "Todas las sesiones cerradas" });
  } catch (err) {
    return res.status(500).json({ error: "Error cerrando sesiones" });
  }
}
