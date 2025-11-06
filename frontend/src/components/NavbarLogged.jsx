import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../auth/auth";
import "./Navbar.css";

export default function NavbarLogged() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef();
  const navigate = useNavigate();

  // ✅ Cargar usuario al montar
  useEffect(() => {
    const savedUser = auth.getUser();
    if (savedUser) setUser(savedUser);
  }, []);

  // ✅ Cerrar sesión
  const handleLogout = async () => {
    try {
      await auth.logout(); // hace POST /auth/logout y limpia tokens
      navigate("/");
      window.location.reload(); // refresca el navbar
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  // ✅ Cerrar menú si clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="navbar">
      {/* ---------- LADO IZQUIERDO ---------- */}
      <div className="nav-left">
        <Link to="/" className="nav-logo">
          Arepabuelas de la Esquina
        </Link>
      </div>

      {/* ---------- LADO DERECHO ---------- */}
      <div className="nav-links">
        <Link to="/">Inicio</Link>
        <Link to="/products">Tienda</Link>
        <Link to="/about">Acerca de</Link>
        <Link to="/blog">Blog</Link>
        <Link to="/contact">Contacto</Link>
        <Link to="/cart" className="cart-icon">🛒</Link>

        {/* ---------- MENÚ DE PERFIL ---------- */}
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
                <strong>{user?.name || "Usuario"}</strong>
                <p>{user?.email || "Sin correo"}</p>
              </div>
              <hr />

              <button
                className="profile-orders"
                onClick={() => navigate("/orders")}
              >
                Mis Pedidos
              </button>

              {/* 🔹 Solo visible para el admin */}
              {user?.role === "admin" && (
                <button
                  className="profile-admin"
                  onClick={() => navigate("/admin")}
                >
                  🛠️ Panel Admin
                </button>
              )}

              <button className="logout-btn" onClick={handleLogout}>
                ⎋ Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
