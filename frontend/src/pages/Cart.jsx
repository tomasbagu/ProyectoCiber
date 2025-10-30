import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Cart.css";

export default function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    const fixedCart = storedCart.map((item) => ({
      ...item,
      quantity: item.quantity || 1,
    }));
    setCartItems(fixedCart);
  }, []);

  const handleQuantityChange = (id, delta) => {
    const updated = cartItems.map((item) =>
      item.id === id
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    );
    setCartItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  const handleRemove = (id) => {
    const updated = cartItems.filter((item) => item.id !== id);
    setCartItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  const applyCoupon = () => {
    if (coupon.trim().toUpperCase() === "BIENVENIDO") {
      setDiscount(0.2);
    } else {
      setDiscount(0);
    }
  };

  const subtotal = cartItems.reduce(
    (acc, item) => acc + (item.price_cents || 0) * (item.quantity || 1),
    0
  );
  const total = subtotal * (1 - discount);

  const formatPrice = (value) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1>Mi Carrito</h1>
        <button className="cart-back" onClick={() => navigate(-1)}>
          ← Volver
        </button>
      </div>

      <div className="cart-layout">
        {/* Lista de productos */}
        <div className="cart-items">
          {cartItems.length === 0 ? (
            <p>
              Tu carrito está vacío. <Link to="/products">Ir a la tienda</Link>
            </p>
          ) : (
            cartItems.map((item) => (
              <div className="cart-item" key={item.id}>
                <div className="cart-item-left">
                  <img
                    src={item.image_url || item.image || "/placeholder.jpg"}
                    alt={item.name}
                    className="cart-item-img"
                  />
                  <div className="cart-item-info">
                    <h3>{item.name}</h3>
                    <p>{formatPrice(item.price_cents)}</p>
                  </div>
                </div>

                <div className="cart-item-right">
                  <div className="cart-quantity">
                    <button onClick={() => handleQuantityChange(item.id, -1)}>
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => handleQuantityChange(item.id, 1)}>
                      +
                    </button>
                  </div>

                  <div className="cart-item-price">
                    {formatPrice(item.price_cents * item.quantity)}
                  </div>

                  <button
                    className="cart-item-remove"
                    onClick={() => handleRemove(item.id)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Resumen del pedido */}
        <div className="cart-summary">
          <h3>Resumen del Pedido</h3>

          <div className="coupon-box">
            <label>Cupón de Descuento</label>
            <div className="coupon-input">
              <input
                type="text"
                placeholder="Código de cupón"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
              />
              <button onClick={applyCoupon}>🏷️</button>
            </div>
            <p className="coupon-hint">
              Nuevos usuarios: usa el cupón <strong>BIENVENIDO</strong> para 20%
              de descuento
            </p>
          </div>

          <hr />

          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          <div className="summary-row total">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>

          <button className="checkout-btn" onClick={() => navigate("/checkout")}>
              Proceder al Pago
          </button>

        </div>
      </div>
    </div>
  );
}
