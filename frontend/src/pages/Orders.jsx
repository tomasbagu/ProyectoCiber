import { useState, useEffect } from "react";
import api from "../api/axios";
import { auth } from "../auth/auth";
import "./Orders.css";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [user] = useState(auth.getUser());

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const endpoint =
          user?.role === "admin" ? "/orders" : "/orders/my-orders";
        const res = await api.get(endpoint);

        // 🔹 Arreglamos la estructura dependiendo del rol
        if (user?.role === "admin") {
          setOrders(res.data.orders || []);
        } else {
          setOrders(res.data || []);
        }
      } catch (err) {
        console.error("Error cargando órdenes:", err);
        setError("No se pudieron cargar las órdenes.");
      }
    };

    fetchOrders();
  }, []); // Solo se ejecuta una vez al montar

  const formatPrice = (value) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value || 0);

  return (
    <div className="orders-page">
      <h1>
        {user?.role === "admin"
          ? "Órdenes de Todos los Usuarios"
          : "Mis Compras"}
      </h1>

      {error && <p className="orders-error">{error}</p>}

      {orders.length === 0 ? (
        <p className="orders-empty">
          {user?.role === "admin"
            ? "No hay órdenes registradas."
            : "Aún no has realizado ninguna compra."}
        </p>
      ) : (
        <div className="orders-list">
          {orders.map((o) => (
            <div className="order-card" key={o.id}>
              <div className="order-header">
                <h3>Orden #{o.id}</h3>
                <span>{new Date(o.created_at).toLocaleString("es-CO")}</span>
              </div>

              {user?.role === "admin" && (
                <p className="order-user">
                  👤 <strong>{o.user_name}</strong> ({o.user_email})
                </p>
              )}

              <div className="order-items">
                {o.items?.map((item, i) => (
                  <div key={i} className="order-item">
                    <span>
                      {item.quantity} × {item.product_name}
                    </span>
                    <span>{formatPrice(item.unit_price_cents)}</span>
                  </div>
                ))}
              </div>

              <div className="order-total">
                Total: <strong>{formatPrice(o.total_cents)}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
