import crypto from "crypto";

/**
 * ⚠️ ADVERTENCIA: ENCRIPTACIÓN DE DATOS SENSIBLES
 * 
 * Este módulo encripta tokens de pago simulados usando AES-256-GCM.
 * 
 * IMPORTANTE:
 * - En un sistema real, NO almacenar datos de tarjetas
 * - Usar tokenización del procesador de pagos
 * - Este código es solo para demostración educativa
 * - La clave ENCRYPTION_KEY debe ser de 256 bits (32 bytes en base64)
 */

const KEY = process.env.ENCRYPTION_KEY; // 32 bytes base64 o hex en env

// Validación estricta de la clave de encriptación
if (!KEY) {
  console.error("❌ ERROR CRÍTICO: ENCRYPTION_KEY no está configurada en .env");
  console.error("💡 Genera una clave segura con: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"");
  process.exit(1); // Forzar salida de la aplicación
}

let keyBuffer;
try {
  keyBuffer = Buffer.from(KEY, "base64");
  if (keyBuffer.length !== 32) {
    console.error(`❌ ERROR CRÍTICO: ENCRYPTION_KEY debe ser de 32 bytes (256 bits). Longitud actual: ${keyBuffer.length} bytes`);
    console.error("💡 Genera una clave segura con: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"");
    process.exit(1);
  }
  console.log("✅ ENCRYPTION_KEY validada correctamente (256 bits)");
} catch (error) {
  console.error("❌ ERROR CRÍTICO: ENCRYPTION_KEY no es un string base64 válido");
  console.error("💡 Genera una clave segura con: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"");
  process.exit(1);
}

export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(data) {
  const b = Buffer.from(data, "base64");
  const iv = b.subarray(0, 12);
  const tag = b.subarray(12, 28);
  const encrypted = b.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
