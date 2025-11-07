import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { sanitizeText } from "../utils/sanitizeHTML";
import "./Cart.css";

export default function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [coupon, setCoupon] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountFixed, setDiscountFixed] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [loadingCoupon, setLoadingCoupon] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    const fixedCart = storedCart.map((item) => ({
      ...item,
      quantity: item.quantity || 1,
    }));
    setCartItems(fixedCart);

    // Restaurar cupon si existía
    const savedCoupon = localStorage.getItem("couponCode");
    const savedPercent = localStorage.getItem("discountPercent");
    const savedFixed = localStorage.getItem("discountFixed");

    if (savedCoupon) setCoupon(savedCoupon);
    if (savedPercent) setDiscountPercent(parseFloat(savedPercent) / 100);
    if (savedFixed) setDiscountFixed(parseInt(savedFixed));
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

  // ✅ Validar cupón con el backend
  const applyCoupon = async () => {
    if (!coupon.trim()) {
      setCouponMessage("Por favor ingresa un código de cupón");
      return;
    }

    try {
      setLoadingCoupon(true);
      setCouponMessage("");

      const res = await api.post("/coupons/validate", { code: coupon });
      const data = res.data;

      if (data.discount_percent > 0) {
        setDiscountPercent(data.discount_percent / 100);
        setDiscountFixed(0);
        localStorage.setItem("couponCode", coupon);
        localStorage.setItem("discountPercent", data.discount_percent);
        localStorage.removeItem("discountFixed");
        setCouponMessage(`✅ ${data.discount_percent}% de descuento aplicado`);
      } else if (data.amount_cents > 0) {
        setDiscountFixed(data.amount_cents);
        setDiscountPercent(0);
        localStorage.setItem("couponCode", coupon);
        localStorage.setItem("discountFixed", data.amount_cents);
        localStorage.removeItem("discountPercent");
        setCouponMessage(
          `✅ Descuento de ${new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
          }).format(data.amount_cents)} aplicado`
        );
      } else {
        setCouponMessage("⚠️ Cupón válido pero sin descuento");
      }
    } catch (err) {
      console.error("Error al validar cupón:", err);
      setDiscountPercent(0);
      setDiscountFixed(0);
      localStorage.removeItem("couponCode");
      localStorage.removeItem("discountPercent");
      localStorage.removeItem("discountFixed");
      
      // Mensajes más específicos para cada error
      if (err.response?.status === 401) {
        setCouponMessage("❌ Debes iniciar sesión para usar cupones");
      } else if (err.response?.data?.error) {
        setCouponMessage("❌ " + err.response.data.error);
      } else {
        setCouponMessage("❌ Error al validar el cupón");
      }
    } finally {
      setLoadingCoupon(false);
    }
  };

  const subtotal = cartItems.reduce(
    (acc, item) => acc + (item.price_cents || 0) * (item.quantity || 1),
    0
  );

  const total = Math.max(0, subtotal * (1 - discountPercent) - discountFixed);

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
                    alt={sanitizeText(item.name)}
                    className="cart-item-img"
                  />
                  <div className="cart-item-info">
                    <h3>{sanitizeText(item.name)}</h3>
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
                disabled={loadingCoupon}
              />
              <button onClick={applyCoupon} disabled={loadingCoupon}>
                {loadingCoupon ? "..." : "🏷️"}
              </button>
            </div>

            {couponMessage && (
              <p
                className="coupon-hint"
                style={{
                  color: couponMessage.includes("✅") ? "green" : "red",
                  marginTop: "5px",
                }}
              >
                {couponMessage}
              </p>
            )}
          </div>

          <hr />

          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          {discountPercent > 0 && (
            <div className="summary-row">
              <span>Descuento ({discountPercent * 100}%)</span>
              <span>-{formatPrice(subtotal * discountPercent)}</span>
            </div>
          )}

          {discountFixed > 0 && (
            <div className="summary-row">
              <span>Descuento fijo</span>
              <span>-{formatPrice(discountFixed)}</span>
            </div>
          )}

          <div className="summary-row total">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>

          <button
            className="checkout-btn"
            onClick={() => navigate("/checkout")}
          >
            Proceder al Pago
          </button>
        </div>
      </div>
    </div>
  );
}
