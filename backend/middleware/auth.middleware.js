import { verifyAccessToken } from "../utils/jwt.js";
import { getTokenVersion } from "../models/user.model.js";

/**
 * Middleware que requiere autenticación válida
 * Verifica el token JWT y valida su versión
 */
export async function authRequired(req, res, next) {
  const header = req.headers.authorization;
  
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token requerido" });
  }

  const token = header.substring(7); // Remover "Bearer "
  
  if (!token || token.length < 10) {
    return res.status(401).json({ error: "Token inválido" });
  }

  try {
    const decoded = verifyAccessToken(token);
    
    // Validar que el token no haya sido revocado (verificar versión)
    if (decoded.id) {
      const currentVersion = await getTokenVersion(decoded.id);
      const tokenVersion = parseInt(decoded.ver || "1", 10);
      
      if (tokenVersion !== currentVersion) {
        return res.status(401).json({ 
          error: "Token revocado", 
          code: "TOKEN_REVOKED" 
        });
      }
    }

    // Adjuntar usuario decodificado a la request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      tokenVersion: decoded.ver,
    };
    
    next();
  } catch (err) {
    const message = err.message === "Token expirado" 
      ? "Token expirado" 
      : "Token inválido o expirado";
      
    return res.status(401).json({ 
      error: message,
      code: err.message === "Token expirado" ? "TOKEN_EXPIRED" : "TOKEN_INVALID"
    });
  }
}

/**
 * Middleware que requiere rol de administrador
 * Debe usarse después de authRequired
 */
export function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }
  
  if (req.user.role !== "admin") {
    return res.status(403).json({ 
      error: "Acceso denegado. Se requiere rol de administrador" 
    });
  }
  
  next();
}

/**
 * Middleware que verifica roles específicos
 * @param {string[]} allowedRoles - Array de roles permitidos
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: "Acceso denegado. Rol insuficiente" 
      });
    }
    
    next();
  };
}

/**
 * Middleware opcional de autenticación
 * Si hay token lo valida, si no continúa sin user
 */
export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  
  if (!header || !header.startsWith("Bearer ")) {
    return next();
  }

  const token = header.substring(7);
  
  try {
    const decoded = verifyAccessToken(token);
    
    // Validar versión del token
    if (decoded.id) {
      const currentVersion = await getTokenVersion(decoded.id);
      const tokenVersion = parseInt(decoded.ver || "1", 10);
      
      if (tokenVersion === currentVersion) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
        };
      }
    }
  } catch (err) {
    // Si falla, simplemente no adjuntar usuario
  }
  
  next();
}
