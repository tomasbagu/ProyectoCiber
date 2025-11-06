import pool from "../config/db.js";

/**
 * Almacena un refresh token hasheado en la base de datos
 * @param {Object} params
 * @param {number} params.userId - ID del usuario
 * @param {string} params.tokenHash - Hash del token (SHA-256)
 * @param {Date} params.expiresAt - Fecha de expiración
 * @param {string} params.userAgent - User agent del cliente
 * @param {string} params.ipAddress - IP del cliente
 * @returns {Promise<Object>}
 */
export async function storeRefreshToken({ userId, tokenHash, expiresAt, userAgent = null, ipAddress = null }) {
  const result = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address, last_used_at) 
     VALUES ($1, $2, $3, $4, $5, NOW()) 
     RETURNING id, created_at`,
    [userId, tokenHash, expiresAt, userAgent, ipAddress]
  );
  return result.rows[0];
}

/**
 * Busca un refresh token por su hash
 * @param {string} tokenHash - Hash del token
 * @returns {Promise<Object|null>}
 */
export async function findRefreshToken(tokenHash) {
  const res = await pool.query(
    `SELECT rt.*, u.role, u.email, u.token_version 
     FROM refresh_tokens rt 
     JOIN users u ON rt.user_id = u.id 
     WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL`,
    [tokenHash]
  );
  return res.rows[0];
}

/**
 * Actualiza la fecha de último uso de un refresh token
 * @param {string} tokenHash - Hash del token
 * @returns {Promise<void>}
 */
export async function updateTokenLastUsed(tokenHash) {
  await pool.query(
    `UPDATE refresh_tokens 
     SET last_used_at = NOW() 
     WHERE token_hash = $1`,
    [tokenHash]
  );
}

/**
 * Revoca (invalida) un refresh token específico
 * @param {string} tokenHash - Hash del token a revocar
 * @returns {Promise<void>}
 */
export async function revokeRefreshToken(tokenHash) {
  await pool.query(
    `UPDATE refresh_tokens 
     SET revoked_at = NOW() 
     WHERE token_hash = $1`,
    [tokenHash]
  );
}

/**
 * Elimina un refresh token específico
 * @param {string} tokenHash - Hash del token
 * @returns {Promise<void>}
 */
export async function deleteRefreshToken(tokenHash) {
  await pool.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [tokenHash]);
}

/**
 * Elimina todos los refresh tokens de un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<void>}
 */
export async function deleteAllRefreshTokensForUser(userId) {
  await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
}

/**
 * Revoca todos los tokens de un usuario (útil al cambiar contraseña)
 * @param {number} userId - ID del usuario
 * @returns {Promise<void>}
 */
export async function revokeAllUserTokens(userId) {
  await pool.query(
    `UPDATE refresh_tokens 
     SET revoked_at = NOW() 
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

/**
 * Elimina tokens expirados (limpieza periódica)
 * @returns {Promise<number>} - Número de tokens eliminados
 */
export async function cleanupExpiredTokens() {
  const result = await pool.query(
    `DELETE FROM refresh_tokens 
     WHERE expires_at < NOW() 
     RETURNING id`
  );
  return result.rowCount;
}

/**
 * Elimina tokens no usados en más de X días
 * @param {number} days - Días de inactividad
 * @returns {Promise<number>} - Número de tokens eliminados
 */
export async function cleanupInactiveTokens(days = 30) {
  const result = await pool.query(
    `DELETE FROM refresh_tokens 
     WHERE last_used_at < NOW() - INTERVAL '${days} days'
     RETURNING id`
  );
  return result.rowCount;
}

/**
 * Obtiene el número de sesiones activas de un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<number>}
 */
export async function getActiveSessionCount(userId) {
  const result = await pool.query(
    `SELECT COUNT(*) as count 
     FROM refresh_tokens 
     WHERE user_id = $1 
       AND expires_at > NOW() 
       AND revoked_at IS NULL`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Limita el número de sesiones activas por usuario
 * @param {number} userId - ID del usuario
 * @param {number} maxSessions - Número máximo de sesiones
 * @returns {Promise<void>}
 */
export async function limitUserSessions(userId, maxSessions = 5) {
  // Eliminar las sesiones más antiguas si se excede el límite
  await pool.query(
    `DELETE FROM refresh_tokens 
     WHERE id IN (
       SELECT id FROM refresh_tokens 
       WHERE user_id = $1 
         AND expires_at > NOW() 
         AND revoked_at IS NULL
       ORDER BY last_used_at ASC 
       LIMIT (
         SELECT GREATEST(0, COUNT(*) - $2) 
         FROM refresh_tokens 
         WHERE user_id = $1 
           AND expires_at > NOW() 
           AND revoked_at IS NULL
       )
     )`,
    [userId, maxSessions]
  );
}
