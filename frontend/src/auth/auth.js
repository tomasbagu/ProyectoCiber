import api from "../api/axios";

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const USER_KEY = "user_info";

export const auth = {
  setSession({ accessToken, refreshToken, user }) {
    if (accessToken) sessionStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) sessionStorage.setItem(REFRESH_KEY, refreshToken);
    if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    this.notifyChange(); // 👈 importante
  },

  clear() {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.notifyChange(); // 👈 importante
  },

  getAccess() {
    return sessionStorage.getItem(ACCESS_KEY);
  },
  getRefresh() {
    return sessionStorage.getItem(REFRESH_KEY);
  },
  getUser() {
    const raw = sessionStorage.getItem(USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  isAuthenticated() {
    return !!sessionStorage.getItem(ACCESS_KEY);
  },
  hasRole(role) {
    const u = this.getUser();
    return u?.role === role;
  },

  async logout() {
    try {
      const refreshToken = this.getRefresh();
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch (err) {
      console.error("Error cerrando sesión:", err);
    } finally {
      this.clear();
    }
  },

  // 👇 ESTA FUNCIÓN ES LA CLAVE
  notifyChange() {
    window.dispatchEvent(new Event("sessionChange"));
  },
};
