import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
    await auth.logout(); // hace POST /auth/logout y limpia tokens
    navigate("/");       
    window.location.reload(); // recarga navbar
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
      <div className="nav-left">
        <h2
          className="nav-logo"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          Arepabuelas de la Esquina
        </h2>
      </div>

      <div className="nav-links">
        <a onClick={() => navigate("/")}>Inicio</a>
        <a onClick={() => navigate("/products")}>Tienda</a>
        <a onClick={() => navigate("/about")}>Acerca de</a>
        <a onClick={() => navigate("/blog")}>Blog</a>
        <a onClick={() => navigate("/contact")}>Contacto</a>
        <a onClick={() => navigate("/cart")} className="cart-icon">
          🛒
        </a>

        {/* ---------- MENÚ DE PERFIL ---------- */}
        <div className="profile-wrapper" ref={menuRef}>
          <div
            className="profile-circle"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {user?.name?.[0]?.toUpperCase() || "👤"}
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
