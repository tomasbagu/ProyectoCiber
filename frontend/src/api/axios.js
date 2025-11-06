import axios from "axios";
import { auth } from "../auth/auth";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
  timeout: 30000, // 30 segundos timeout
});

// Adjuntar access token a cada request
api.interceptors.request.use(
  (config) => {
    const token = auth?.getAccess();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Manejo de errores con refresh token automático
let refreshing = null;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Si el error no es 401 o ya reintentamos, rechazar
    if (!error.response || error.response.status !== 401 || original._retry) {
      // Manejar errores específicos
      if (error.response?.status === 423) {
        // Cuenta bloqueada
        auth?.clear();
        window.location.href = "/login?error=account_locked";
      }
      return Promise.reject(error);
    }

    // Verificar si es un error de token revocado
    if (error.response?.data?.code === "TOKEN_REVOKED") {
      auth?.clear();
      window.location.href = "/login?error=session_revoked";
      return Promise.reject(error);
    }

    // Marcar como reintentado
    original._retry = true;

    // Si ya hay un refresh en curso, esperar
    if (refreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    // Iniciar proceso de refresh
    const refreshToken = auth?.getRefresh();
    
    if (!refreshToken) {
      auth?.clear();
      window.location.href = "/login?error=session_expired";
      return Promise.reject(error);
    }

    refreshing = true;

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
        { refreshToken },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        }
      );

      const { accessToken, refreshToken: newRefreshToken } = response.data;

      if (!accessToken) {
        throw new Error("No access token received");
      }

      // Actualizar tokens
      auth?.setSession({ 
        accessToken, 
        refreshToken: newRefreshToken || refreshToken 
      });

      // Procesar cola de peticiones fallidas
      processQueue(null, accessToken);

      // Reintentar petición original
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);

    } catch (refreshError) {
      // Si falla el refresh, cerrar sesión
      processQueue(refreshError, null);
      auth?.clear();
      
      // Redirigir según el tipo de error
      const errorCode = refreshError.response?.data?.code;
      if (errorCode === "REFRESH_TOKEN_EXPIRED") {
        window.location.href = "/login?error=session_expired";
      } else if (errorCode === "INVALID_REFRESH_TOKEN") {
        window.location.href = "/login?error=invalid_session";
      } else {
        window.location.href = "/login?error=auth_error";
      }
      
      return Promise.reject(refreshError);
    } finally {
      refreshing = false;
    }
  }
);

// Interceptor para verificar si el token está por expirar
// y hacer refresh preventivo
let preventiveRefreshTimeout = null;

const schedulePreventiveRefresh = () => {
  if (preventiveRefreshTimeout) {
    clearTimeout(preventiveRefreshTimeout);
  }

  if (!auth?.isTokenExpiringSoon || !auth?.getRefresh) {
    return; // auth aún no está inicializado
  }

  if (auth.isTokenExpiringSoon() && auth.getRefresh()) {
    // Hacer refresh preventivo 1 minuto antes de expirar
    const timeRemaining = auth.getTokenTimeRemaining();
    const refreshIn = Math.max(0, (timeRemaining - 60) * 1000);

    preventiveRefreshTimeout = setTimeout(async () => {
      try {
        const refreshToken = auth.getRefresh();
        if (!refreshToken) return;

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
          { refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        auth?.setSession({ 
          accessToken, 
          refreshToken: newRefreshToken || refreshToken 
        });

        // Programar próximo refresh
        schedulePreventiveRefresh();
      } catch (err) {
        // Si falla, dejar que el interceptor lo maneje
      }
    }, refreshIn);
  }
};

// Inicializar scheduler de refresh preventivo después de que todo esté cargado
setTimeout(() => {
  if (auth?.isAuthenticated()) {
    schedulePreventiveRefresh();
  }
  
  // Escuchar cambios de sesión para actualizar scheduler
  window.addEventListener("sessionChange", () => {
    schedulePreventiveRefresh();
  });
}, 0);

export default api;
