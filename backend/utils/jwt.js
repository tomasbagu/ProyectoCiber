import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_EXPIRES = process.env.ACCESS_EXPIRES || "15m";
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ALGORITHM = "HS256"; // Algoritmo explícito para prevenir ataques de confusión

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET debe tener al menos 32 caracteres");
}

/**
 * Genera un access token JWT con claims seguros
 * @param {Object} payload - Datos a incluir en el token (id, email, role)
 * @param {string} tokenVersion - Versión del token para invalidación
 * @returns {string}
 */
export function signAccessToken(payload, tokenVersion = "1") {
  // Agregar claims de seguridad adicionales
  const securePayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID(), // JWT ID único
    ver: tokenVersion, // Versión del token
  };

  return jwt.sign(securePayload, JWT_SECRET, {
    expiresIn: ACCESS_EXPIRES,
    algorithm: JWT_ALGORITHM,
    issuer: "arepabuelas-api",
    audience: "arepabuelas-app",
  });
}

/**
 * Verifica y decodifica un access token
 * @param {string} token - Token a verificar
 * @returns {Object} - Payload decodificado
 * @throws {Error} - Si el token es inválido
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
      issuer: "arepabuelas-api",
      audience: "arepabuelas-app",
    });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new Error("Token expirado");
    }
    if (err.name === "JsonWebTokenError") {
      throw new Error("Token inválido");
    }
    throw err;
  }
}

/**
 * Genera un refresh token seguro hasheado
 * @returns {Object} - { token: string, hash: string }
 */
export function generateRefreshToken() {
  // Generar token aleatorio de 64 bytes
  const token = crypto.randomBytes(64).toString("base64url");
  
  // Hashear el token antes de almacenar en BD
  const hash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  return { token, hash };
}

/**
 * Hashea un refresh token para comparación
 * @param {string} token - Token a hashear
 * @returns {string} - Hash del token
 */
export function hashRefreshToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

/**
 * Extrae el payload de un JWT sin verificar (solo para debug)
 * @param {string} token
 * @returns {Object|null}
 */
export function decodeTokenUnsafe(token) {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}
