import { verifyAccessToken } from "../utils/jwt.js";

export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Token requerido" });

  const token = header.split(" ")[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "No autenticado" });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Solo administradores" });
  next();
}
