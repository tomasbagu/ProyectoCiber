import axios from "axios";
import { auth } from "../auth/auth";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// Adjuntar access token
api.interceptors.request.use((config) => {
  const token = auth.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Manejo de 401 con refresh
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshing) {
          const refreshToken = auth.getRefresh();
          refreshing = axios.post(
            `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
            { refreshToken },
            { headers: { "Content-Type": "application/json" } }
          ).then((r) => r.data).finally(() => (refreshing = null));
        }
        const data = await refreshing;
        auth.setSession({ accessToken: data?.accessToken });
        original.headers.Authorization = `Bearer ${auth.getAccess()}`;
        return api(original);
      } catch (e) {
        auth.clear();
        window.location.href = "/login";
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
