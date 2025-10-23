import crypto from "crypto";

// Luhn check
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

// generar provider token simulado (uuid-like)
export function generateProviderToken() {
  return crypto.randomUUID();
}
