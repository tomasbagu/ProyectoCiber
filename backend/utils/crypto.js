import crypto from "crypto";


const KEY = process.env.ENCRYPTION_KEY; // 32 bytes base64 o hex en env

if (!KEY) {
  console.warn("⚠️ ENCRYPTION_KEY no configurado. Define ENCRYPTION_KEY en .env");
}

export function encrypt(text) {
  if (!KEY) throw new Error("ENCRYPTION_KEY no configurada");
  const key = Buffer.from(KEY, "base64"); // espera base64 32 bytes
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(data) {
  if (!KEY) throw new Error("ENCRYPTION_KEY no configurada");
  const key = Buffer.from(KEY, "base64");
  const b = Buffer.from(data, "base64");
  const iv = b.subarray(0, 12);
  const tag = b.subarray(12, 28);
  const encrypted = b.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
