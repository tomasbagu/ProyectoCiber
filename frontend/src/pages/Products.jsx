import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // 👈 Importamos para navegar
import api from "../api/axios";
import "./Products.css";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("Todas");
  const navigate = useNavigate(); // 👈 Hook de navegación

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get("/products");
        const data = res.data.products || res.data || [];
        setProducts(data);
      } catch (err) {
        console.error("Error al cargar productos:", err);
      }
    };
    fetchProducts();
  }, []);

  const categories = ["Todas", "Tradicionales", "Especiales", "Rellenas", "Dulces"];

  const filteredProducts = products.filter((p) => {
    if (category === "Todas") return true;

    const name = p.name?.toLowerCase() || "";

    switch (category) {
      case "Tradicionales":
        return name.includes("queso");
      case "Especiales":
        return name.includes("pepiada") || name.includes("pabellón") || name.includes("pabellon");
      case "Rellenas":
        return name.includes("pelua") || name.includes("huevo");
      case "Dulces":
        return name.includes("choclo") || name.includes("dulce");
      default:
        return true;
    }
  });

  // ✅ Mostrar formato $4.500 en lugar de 45 o 4500
  const formatPrice = (value) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);

  return (
    <div className="products-page">
      <section className="header">
        <h1>Comprar colecciones</h1>
        <p>Hechas con amor y tradición boyacense</p>

        <div className="categories">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={category === cat ? "active" : ""}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="product-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((p) => (
            <div
              className="product-card"
              key={p.id}
              onClick={() => navigate(`/product/${p.id}`)} // 👈 Redirige al detalle
              style={{ cursor: "pointer" }} // 👈 Cambia el cursor
            >
              <div className="product-image">
                <img
                  src={p.image_url || "/placeholder.jpg"}
                  alt={p.name}
                />
              </div>
              <div className="product-info">
                <h3>{p.name}</h3>
                <p>{formatPrice(p.price_cents)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="no-products">No hay productos en esta categoría.</p>
        )}
      </section>
    </div>
  );
}
