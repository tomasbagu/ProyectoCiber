import { useState, useEffect } from "react";
import api from "../api/axios";
import "./AdminPanel.css";

export default function AdminPanel() {
  const [tab, setTab] = useState("productos");
  const [products, setProducts] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cargar productos y usuarios pendientes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const [prodRes, usersRes] = await Promise.all([
          api.get("/products"),
          api.get("/admin/pending-users"),
        ]);

        setProducts(prodRes.data.products || prodRes.data || []);
        setPendingUsers(usersRes.data.pending || usersRes.data || []);
      } catch (err) {
        console.error("Error cargando datos:", err);
        setError("No se pudieron cargar los datos del servidor.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Aprobar usuario
  const handleApprove = async (id) => {
    try {
      await api.post(`/admin/approve/${id}`);
      setPendingUsers((prev) => prev.filter((u) => u.id !== id));
      alert("Usuario aprobado correctamente ✅");
    } catch (err) {
      console.error("Error al aprobar usuario:", err);
      alert("Error al aprobar usuario. Verifica el backend.");
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Panel de Administración</h1>
        <nav className="admin-tabs">
          <button
            className={tab === "productos" ? "active" : ""}
            onClick={() => setTab("productos")}
          >
            Productos
          </button>
          <button
            className={tab === "usuarios" ? "active" : ""}
            onClick={() => setTab("usuarios")}
          >
            Usuarios Pendientes
          </button>
        </nav>
      </header>

      {loading && <p className="loading">Cargando datos...</p>}
      {error && <p className="error">{error}</p>}

     {/* SECCIÓN PRODUCTOS */}
{tab === "productos" && (
  <section className="admin-section">
    <div className="admin-products-header">
      <h2>Gestión de Productos ({products.length})</h2>
      <button className="new-product-btn">＋ Nuevo Producto</button>
    </div>

    {products.length === 0 ? (
      <p>No hay productos disponibles.</p>
    ) : (
      <div className="admin-products-list">
        {products.map((p) => (
          <div className="product-item" key={p.id}>
            <img
              src={p.image_url || "/placeholder.jpg"}
              alt={p.name}
              className="product-img"
            />

            <div className="product-info">
              <h3>{p.name}</h3>
              <p className="product-description">
                {p.description?.length > 100
                  ? p.description.slice(0, 100) + "..."
                  : p.description}
              </p>
              <p className="product-price">
                $
                {new Intl.NumberFormat("es-CO", {
                  minimumFractionDigits: 0,
                }).format(p.price_cents || 0)}
              </p>

              <div className="product-badges">
                <span className="badge available">Disponible</span>
                <span
                  className={`badge category ${
                    p.name.toLowerCase().includes("queso")
                      ? "tradicional"
                      : p.name.toLowerCase().includes("pepiada") ||
                        p.name.toLowerCase().includes("pabellón")
                      ? "especial"
                      : "rellena"
                  }`}
                >
                  {p.name.toLowerCase().includes("queso")
                    ? "Tradicionales"
                    : p.name.toLowerCase().includes("pepiada") ||
                      p.name.toLowerCase().includes("pabellón")
                    ? "Especiales"
                    : "Rellenas"}
                </span>
              </div>

              <div className="product-actions">
                <button className="edit-btn">✏️ Editar</button>
                <button className="delete-btn">🗑 Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
)}


      {/* Usuarios */}
      {tab === "usuarios" && (
        <section className="admin-section">
          <h2>Usuarios pendientes de aprobación</h2>
          {pendingUsers.length === 0 ? (
            <p>No hay usuarios pendientes por aprobar.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Fecha Registro</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      {new Date(user.created_at).toLocaleString("es-CO")}
                    </td>
                    <td>
                      <button
                        className="approve-btn"
                        onClick={() => handleApprove(user.id)}
                      >
                        ✅ Aprobar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
