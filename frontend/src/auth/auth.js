import api from "../api/axios";

// Usar localStorage con httpOnly simulado (mejor que sessionStorage para persistencia)
// En producción ideal: usar httpOnly cookies para tokens
const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const USER_KEY = "user_info";

// Clase para cifrado básico de tokens en localStorage
class SecureStorage {
  constructor(key) {
    this.key = key;
  }

  // XOR simple para ofuscar (NO ES CIFRADO REAL - solo ofuscación)
  _encode(str) {
    if (!str) return null;
    try {
      return btoa(
        str
          .split("")
          .map((char, i) => 
            String.fromCharCode(char.charCodeAt(0) ^ this.key.charCodeAt(i % this.key.length))
          )
          .join("")
      );
    } catch {
      return null;
    }
  }

  _decode(str) {
    if (!str) return null;
    try {
      const decoded = atob(str);
      return decoded
        .split("")
        .map((char, i) => 
          String.fromCharCode(char.charCodeAt(0) ^ this.key.charCodeAt(i % this.key.length))
        )
        .join("");
    } catch {
      return null;
    }
  }

  set(key, value) {
    if (!value) {
      localStorage.removeItem(key);
      return;
    }
    const encoded = this._encode(value);
    if (encoded) {
      localStorage.setItem(key, encoded);
    }
  }

  get(key) {
    const value = localStorage.getItem(key);
    return this._decode(value);
  }

  remove(key) {
    localStorage.removeItem(key);
  }

  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

// Instancia de almacenamiento seguro con clave única por aplicación
const storage = new SecureStorage("arepabuelas-2025-secret-key");

export const auth = {
  setSession({ accessToken, user }) {
    if (accessToken) {
      storage.set(ACCESS_KEY, accessToken);
    }
    // OWASP: Refresh token ya NO se guarda en localStorage (está en httpOnly cookie)
    if (user) {
      storage.set(USER_KEY, JSON.stringify(user));
    }
    this.notifyChange();
  },

  clear() {
    storage.clear();
    this.notifyChange();
  },

  getAccess() {
    return storage.get(ACCESS_KEY);
  },

  // OWASP: Ya no exponemos refresh token al frontend
  getRefresh() {
    return null; // Refresh token está en httpOnly cookie
  },

  getUser() {
    const raw = storage.get(USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    const token = this.getAccess();
    if (!token) return false;

    // Verificar que el token no esté expirado (decodificar payload)
    try {
      const payload = this._decodeJWT(token);
      if (!payload || !payload.exp) return false;
      
      // Verificar expiración (con margen de 30 segundos)
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now + 30;
    } catch {
      return false;
    }
  },

  hasRole(role) {
    const u = this.getUser();
    return u?.role === role;
  },

  async logout() {
    try {
      // OWASP: No enviar refresh token, se lee desde cookie httpOnly
      await api.post("/auth/logout").catch(() => {});
    } catch (err) {
      // Silenciar errores de logout
    } finally {
      this.clear();
    }
  },

  async logoutAll() {
    try {
      await api.post("/auth/logout-all");
    } catch (err) {
      // Silenciar errores
    } finally {
      this.clear();
    }
  },

  notifyChange() {
    window.dispatchEvent(new Event("sessionChange"));
  },

  // Decodifica JWT sin verificar (solo para leer exp)
  _decodeJWT(token) {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  },

  // Obtiene tiempo restante del token en segundos
  getTokenTimeRemaining() {
    const token = this.getAccess();
    if (!token) return 0;

    try {
      const payload = this._decodeJWT(token);
      if (!payload || !payload.exp) return 0;
      
      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, payload.exp - now);
    } catch {
      return 0;
    }
  },

  // Verifica si el token está por expirar (menos de 2 minutos)
  isTokenExpiringSoon() {
    const remaining = this.getTokenTimeRemaining();
    return remaining > 0 && remaining < 120; // 2 minutos
  },
};

// Limpiar tokens al cerrar todas las pestañas (solo si se desea)
// Comentado por defecto para mantener sesión
/*
window.addEventListener("beforeunload", () => {
  // Solo si no hay otras pestañas abiertas
  if (performance.navigation.type === performance.navigation.TYPE_NAVIGATE) {
    auth.clear();
  }
});
*/

export default auth;
