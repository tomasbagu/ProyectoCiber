import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import { auth } from "../auth/auth";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Mostrar mensaje si viene desde Register
  useEffect(() => {
    if (location.state?.message) {
      setError(location.state.message);
    }
  }, [location]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      const data = res.data;

      // Guardar sesión correctamente
      auth.setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });

      // Notificar a otros componentes que el usuario cambió
      window.dispatchEvent(new Event("sessionChange"));

      // Redirección según el rol
      if (data.user.role === "admin") navigate("/admin");
      else navigate("/");
    } catch (err) {
        console.error("Error de login:", err.response?.data || err);

        const status = err.response?.status;
        const msg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "";

        if (status === 429 || msg.toLowerCase().includes("demasiados")) {
          setError("🚫 Has realizado demasiados intentos. Intenta nuevamente en unos minutos.");
        } else if (status === 403 || msg.toLowerCase().includes("aprob")) {
          setError("⏳ Tu cuenta aún no ha sido aprobada por el administrador.");
        } else if (status === 401 || msg.toLowerCase().includes("inválid")) {
          setError("❌ Correo o contraseña incorrectos. Inténtalo nuevamente.");
        } else if (status === 404 || msg.toLowerCase().includes("no encontrado")) {
          setError("⚠️ No existe una cuenta con este correo electrónico.");
        } else {
          setError("⚠️ Error inesperado al iniciar sesión. Intenta más tarde.");
        }
      }


  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Iniciar Sesión</h2>
        <p className="subtitle">
          Ingresa tus credenciales para acceder a tu cuenta
        </p>

        <form onSubmit={onSubmit} className="login-form">
          <label>Correo Electrónico</label>
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Contraseña</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="login-btn">
            Iniciar Sesión
          </button>
        </form>

        <p className="register-link">
          ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
}
