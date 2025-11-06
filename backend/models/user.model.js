import pool from "../config/db.js";
import argon2 from "argon2";

// Configuración de Argon2 según OWASP
const ARGON2_CONFIG = {
  type: argon2.argon2id,
  timeCost: 3,
  memoryCost: 2 ** 16, // 64 MB
  parallelism: 1,
};

/**
 * Valida la fortaleza de una contraseña
 * @param {string} password
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push("La contraseña debe tener al menos 8 caracteres");
  }
  if (password.length > 128) {
    errors.push("La contraseña no debe exceder 128 caracteres");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Debe contener al menos una letra minúscula");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Debe contener al menos una letra mayúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Debe contener al menos un número");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Debe contener al menos un carácter especial");
  }

  // Verificar contraseñas comunes
  const commonPasswords = [
    "password", "123456", "password123", "admin123", "qwerty",
    "12345678", "111111", "abc123", "password1", "123123"
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("Esta contraseña es demasiado común");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Crea un nuevo usuario con validación de contraseña
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function createUser({ name, email, password, photo_url }) {
  // Validar fortaleza de contraseña
  const validation = validatePasswordStrength(password);
  if (!validation.valid) {
    throw new Error(validation.errors.join(". "));
  }

  const hash = await argon2.hash(password, ARGON2_CONFIG);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, photo_url, token_version)
     VALUES ($1, $2, $3, $4, 1)
     RETURNING id, name, email, photo_url, role, token_version, created_at`,
    [name, email, hash, photo_url || null]
  );
  return result.rows[0];
}

/**
 * Busca un usuario por email
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
export async function findByEmail(email) {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0];
}

/**
 * Busca un usuario por ID (sin devolver password_hash)
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
export async function findById(id) {
  const result = await pool.query(
    `SELECT id, name, email, role, photo_url, token_version, 
            created_at, locked_until, failed_login_attempts 
     FROM users 
     WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}

/**
 * Aprueba un usuario pendiente
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function approveUser(id) {
  await pool.query(
    `UPDATE users SET role = 'user' WHERE id = $1 AND role = 'pending'`,
    [id]
  );
}

/**
 * Verifica una contraseña contra su hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, hash) {
  try {
    return await argon2.verify(hash, password);
  } catch (err) {
    return false;
  }
}

/**
 * Actualiza la contraseña de un usuario e invalida todas sus sesiones
 * @param {number} userId
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export async function updatePassword(userId, newPassword) {
  const validation = validatePasswordStrength(newPassword);
  if (!validation.valid) {
    throw new Error(validation.errors.join(". "));
  }

  const hash = await argon2.hash(newPassword, ARGON2_CONFIG);

  // Incrementar token_version para invalidar todos los tokens existentes
  await pool.query(
    `UPDATE users 
     SET password_hash = $1, 
         token_version = token_version + 1,
         failed_login_attempts = 0,
         locked_until = NULL
     WHERE id = $2`,
    [hash, userId]
  );
}

/**
 * Incrementa el contador de intentos fallidos de login
 * @param {number} userId
 * @returns {Promise<number>} - Nuevo número de intentos fallidos
 */
export async function incrementFailedLogins(userId) {
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION_MINUTES = 15;

  const result = await pool.query(
    `UPDATE users 
     SET failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE 
           WHEN failed_login_attempts + 1 >= $1 
           THEN NOW() + INTERVAL '${LOCK_DURATION_MINUTES} minutes'
           ELSE locked_until
         END
     WHERE id = $2
     RETURNING failed_login_attempts, locked_until`,
    [MAX_ATTEMPTS, userId]
  );

  return result.rows[0];
}

/**
 * Resetea el contador de intentos fallidos
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function resetFailedLogins(userId) {
  await pool.query(
    `UPDATE users 
     SET failed_login_attempts = 0, 
         locked_until = NULL 
     WHERE id = $1`,
    [userId]
  );
}

/**
 * Verifica si una cuenta está bloqueada
 * @param {number} userId
 * @returns {Promise<Object>} - { locked: boolean, until: Date|null }
 */
export async function isAccountLocked(userId) {
  const result = await pool.query(
    `SELECT locked_until FROM users WHERE id = $1`,
    [userId]
  );

  if (!result.rows[0]) {
    return { locked: false, until: null };
  }

  const lockedUntil = result.rows[0].locked_until;
  if (!lockedUntil) {
    return { locked: false, until: null };
  }

  const now = new Date();
  const locked = new Date(lockedUntil) > now;

  // Si el bloqueo expiró, limpiarlo
  if (!locked) {
    await resetFailedLogins(userId);
  }

  return { locked, until: lockedUntil };
}

/**
 * Incrementa la versión del token de un usuario (invalida todos sus tokens)
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function incrementTokenVersion(userId) {
  await pool.query(
    `UPDATE users SET token_version = token_version + 1 WHERE id = $1`,
    [userId]
  );
}

/**
 * Obtiene la versión actual del token de un usuario
 * @param {number} userId
 * @returns {Promise<number>}
 */
export async function getTokenVersion(userId) {
  const result = await pool.query(
    `SELECT token_version FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0]?.token_version || 1;
}
