import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { validateImageFile, formatFileSize } from "../utils/imageValidation";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    profilePic: null,
  });
  const [error, setError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  // Validación de fortaleza de contraseña
  const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) errors.push("Mínimo 8 caracteres");
    if (!/[a-z]/.test(password)) errors.push("Una letra minúscula");
    if (!/[A-Z]/.test(password)) errors.push("Una letra mayúscula");
    if (!/[0-9]/.test(password)) errors.push("Un número");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("Un carácter especial");
    }

    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Validar contraseña en tiempo real
    if (name === "password") {
      const errors = validatePassword(value);
      setPasswordErrors(errors);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      setFormData({ ...formData, profilePic: null });
      setImagePreview(null);
      return;
    }

    // Validar la imagen
    const validation = await validateImageFile(file);
    
    if (!validation.valid) {
      setError(validation.error);
      setFormData({ ...formData, profilePic: null });
      setImagePreview(null);
      e.target.value = "";
      return;
    }

    // Crear preview seguro
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      setFormData({ ...formData, profilePic: file });
      setError("");
    } catch (err) {
      setError("Error al cargar la imagen");
      setFormData({ ...formData, profilePic: null });
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validaciones del lado del cliente
    if (formData.name.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres");
      setLoading(false);
      return;
    }

    const passErrors = validatePassword(formData.password);
    if (passErrors.length > 0) {
      setError("La contraseña no cumple con los requisitos de seguridad");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    // Validar imagen nuevamente antes de enviar
    if (formData.profilePic) {
      const validation = await validateImageFile(formData.profilePic);
      if (!validation.valid) {
        setError(validation.error);
        setLoading(false);
        return;
      }
    }

    try {
      const data = new FormData();
      data.append("name", formData.name.trim());
      data.append("email", formData.email.toLowerCase().trim());
      data.append("password", formData.password);
      
      if (formData.profilePic) {
        data.append("photo", formData.profilePic);
      }

      const res = await api.post("/auth/register", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.status === 201 || res.status === 200) {
        navigate("/login", {
          state: { message: "Tu cuenta ha sido creada y está en verificación." },
        });
      }
    } catch (err) {
      const msg = err.response?.data?.error;
      const details = err.response?.data?.details;

      if (msg === "Correo ya registrado") {
        setError("⚠️ Este correo ya está en uso. Intenta iniciar sesión.");
      } else if (details && Array.isArray(details)) {
        setError("⚠️ " + details.join(". "));
      } else if (msg && typeof msg === "string") {
        setError(`⚠️ ${msg}`);
      } else {
        setError("⚠️ Ocurrió un error al registrar. Intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h1>Crear Cuenta</h1>
        <p>Regístrate para empezar a disfrutar de nuestras arepas</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre Completo</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label>Correo Electrónico</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              maxLength={255}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Contraseña</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  maxLength={128}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Mostrar/ocultar contraseña"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {formData.password && passwordErrors.length > 0 && (
                <div className="password-requirements" style={{ 
                  marginTop: '8px', 
                  fontSize: '0.85em', 
                  color: '#d32f2f' 
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    Requisitos faltantes:
                  </div>
                  <ul style={{ 
                    margin: 0, 
                    paddingLeft: '20px',
                    listStyle: 'disc'
                  }}>
                    {passwordErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              {formData.password && passwordErrors.length === 0 && (
                <div style={{ 
                  marginTop: '8px', 
                  fontSize: '0.85em', 
                  color: '#2e7d32' 
                }}>
                  ✓ Contraseña segura
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Confirmar Contraseña</label>
              <div className="password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                  maxLength={128}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label="Mostrar/ocultar confirmación"
                >
                  {showConfirmPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Foto de Perfil (opcional - máx. 2MB, JPG/PNG/WEBP)</label>
            <input 
              type="file" 
              name="profilePic" 
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
            />
            {imagePreview && (
              <div className="image-preview" style={{ marginTop: '10px' }}>
                <img 
                  src={imagePreview} 
                  alt="Vista previa" 
                  style={{ maxWidth: '150px', maxHeight: '150px', borderRadius: '8px' }}
                />
                {formData.profilePic && (
                  <p style={{ fontSize: '0.85em', color: '#666' }}>
                    {formData.profilePic.name} ({formatFileSize(formData.profilePic.size)})
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="password-info" style={{
            background: '#f5f5f5',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '0.9em',
            marginBottom: '16px'
          }}>
            <strong>Requisitos de contraseña:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
              <li>Mínimo 8 caracteres</li>
              <li>Una letra mayúscula (A-Z)</li>
              <li>Una letra minúscula (a-z)</li>
              <li>Un número (0-9)</li>
              <li>Un carácter especial (!@#$%...)</li>
            </ul>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="register-btn" disabled={loading}>
            {loading ? "Registrando..." : "Crear Cuenta"}
          </button>
        </form>

        <p className="login-link">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link>
        </p>
      </div>
    </div>
  );
}
