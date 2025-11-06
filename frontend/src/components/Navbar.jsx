import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../auth/auth";
import "./Navbar.css";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();
  const navigate = useNavigate();

useEffect(() => {
  try {
    const token = auth.getAccess();
    if (token) {
      // Obtener usuario desde sessionStorage usando auth.getUser()
      const userData = auth.getUser();
      if (userData) setUser(userData);
    }
  } catch (err) {
    console.error("Error al cargar la sesión:", err);
  }

  // Listener para actualizar el navbar cuando cambie la sesión
  const handleSessionChange = () => {
    const userData = auth.getUser();
    setUser(userData);
  };

  window.addEventListener("sessionChange", handleSessionChange);
  return () => window.removeEventListener("sessionChange", handleSessionChange);
}, []);

  // Cerrar menú si se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    auth.clear();
    setUser(null);
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/" className="nav-logo">
          Arepabuelas de la Esquina
        </Link>
      </div>

      <div className="nav-links">
        <Link to="/">Inicio</Link>
        <Link to="/products">Tienda</Link>
        <Link to="/about">Acerca de</Link>
        <Link to="/blog">Blog</Link>
        <Link to="/contact">Contacto</Link>
        <Link to="/cart" className="cart-icon">
          🛒
        </Link>

        {/* Si hay usuario, mostrar avatar; si no, botón Entrar */}
        {user ? (
          <div className="profile-wrapper" ref={menuRef}>
            <div
              className="profile-circle"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {user?.photo_url ? (
                <img 
                  src={user.photo_url} 
                  alt={user.name} 
                  className="profile-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.textContent = user?.name?.[0]?.toUpperCase() || "👤";
                  }}
                />
              ) : (
                user?.name?.[0]?.toUpperCase() || "👤"
              )}
            </div>

            {menuOpen && (
              <div className="profile-menu">
                <div className="profile-info">
                  <strong>{user.name}</strong>
                  <p>{user.email}</p>
                </div>
                <hr />
                <button
                  className="profile-orders"
                  onClick={() => navigate("/orders")}
                >
                  Mis Pedidos
                </button>
                <button className="logout-btn" onClick={handleLogout}>
                  ⎋ Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="login-btn">
            Entrar
          </Link>
        )}
      </div>
    </nav>
  );
}
