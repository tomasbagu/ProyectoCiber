import crypto from "crypto";

/**
 * ⚠️ ADVERTENCIA: UTILIDADES DE PAGO SIMULADAS
 * 
 * Estas funciones son SOLO para fines educativos y demostración.
 * NO usar en producción con tarjetas reales.
 * 
 * En un sistema real:
 * - Usar SDK del procesador de pagos (Stripe, PayPal, etc.)
 * - NO manejar datos de tarjetas en tu servidor
 * - Tokenizar en el frontend directamente con el procesador
 * - Cumplir con PCI DSS
 */

// Luhn check - Valida el formato del número de tarjeta
// Nota: Una tarjeta puede pasar Luhn y ser inválida (solo valida el formato)
export function luhnCheck(number) {
  const cleaned = ("" + number).replace(/\D/g, "");
  let sum = 0;
  let shouldDouble = false;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

// detect brand by prefix (basic)
export function detectBrand(number) {
  if (/^4/.test(number)) return "Visa";
  if (/^5[1-5]/.test(number)) return "Mastercard";
  if (/^3[47]/.test(number)) return "Amex";
  return "Unknown";
}

// generar provider token simulado (256 bits de entropía)
// Para un sistema de pago real, esto vendría del procesador de pagos
export function generateProviderToken() {
  // 32 bytes = 256 bits de entropía criptográficamente segura
  return crypto.randomBytes(32).toString('hex'); // 64 caracteres hex
}
