import { useState, useEffect } from "react";
import api from "../api/axios";
import { sanitizeText } from "../utils/sanitizeHTML";
import "./AdminPanel.css";

export default function AdminPanel() {
  const [tab, setTab] = useState("productos");
  const [products, setProducts] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Estados para modal de producto
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_cents: "",
    image: null,
  });

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

  // Abrir modal para crear producto
  const handleNewProduct = () => {
    setEditingProduct(null);
    setFormData({ name: "", description: "", price_cents: "", image: null });
    setShowModal(true);
  };

  // Abrir modal para editar producto
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price_cents: product.price_cents,
      image: null,
    });
    setShowModal(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({ name: "", description: "", price_cents: "", image: null });
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    setFormData((prev) => ({ ...prev, image: e.target.files[0] }));
  };

  // Guardar producto (crear o actualizar)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    formDataToSend.append("name", formData.name);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("price_cents", formData.price_cents);
    if (formData.image) {
      formDataToSend.append("image", formData.image);
    }

    try {
      if (editingProduct) {
        // Actualizar
        const res = await api.put(`/products/${editingProduct.id}`, formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? res.data : p))
        );
        alert("Producto actualizado ✅");
      } else {
        // Crear
        const res = await api.post("/products", formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setProducts((prev) => [res.data, ...prev]);
        alert("Producto creado ✅");
      }
      handleCloseModal();
    } catch (err) {
      console.error("Error guardando producto:", err);
      alert("Error al guardar producto: " + (err.response?.data?.error || err.message));
    }
  };

  // Eliminar producto
  const handleDeleteProduct = async (id) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;

    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      alert("Producto eliminado ✅");
    } catch (err) {
      console.error("Error eliminando producto:", err);
      alert("Error al eliminar producto: " + (err.response?.data?.error || err.message));
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
      <button className="new-product-btn" onClick={handleNewProduct}>
        ＋ Nuevo Producto
      </button>
    </div>

    {products.length === 0 ? (
      <p>No hay productos disponibles.</p>
    ) : (
      <div className="admin-products-list">
        {products.map((p) => (
          <div className="product-item" key={p.id}>
            <img
              src={p.image_url || "/placeholder.jpg"}
              alt={sanitizeText(p.name)}
              className="product-img"
            />

            <div className="product-info">
              <h3>{sanitizeText(p.name)}</h3>
              <p className="product-description">
                {sanitizeText(
                  p.description?.length > 100
                    ? p.description.slice(0, 100) + "..."
                    : p.description || ""
                )}
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
                <button className="edit-btn" onClick={() => handleEditProduct(p)}>
                  ✏️ Editar
                </button>
                <button className="delete-btn" onClick={() => handleDeleteProduct(p.id)}>
                  🗑 Eliminar
                </button>
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
                    <td>{sanitizeText(user.name)}</td>
                    <td>{sanitizeText(user.email)}</td>
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

      {/* MODAL PARA CREAR/EDITAR PRODUCTO */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="product-form">
              <div className="form-group">
                <label>Nombre del Producto *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: Arepa de Queso"
                />
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Descripción del producto..."
                />
              </div>

              <div className="form-group">
                <label>Precio (en pesos) *</label>
                <input
                  type="number"
                  name="price_cents"
                  value={formData.price_cents}
                  onChange={handleInputChange}
                  required
                  min="0"
                  placeholder="Ej: 5000"
                />
              </div>

              <div className="form-group">
                <label>Imagen del Producto</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {editingProduct && !formData.image && (
                  <p className="form-hint">
                    Deja vacío para mantener la imagen actual
                  </p>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCloseModal}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-save">
                  {editingProduct ? "Actualizar" : "Crear"} Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
