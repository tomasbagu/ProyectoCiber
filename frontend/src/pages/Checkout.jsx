import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import api from "../api/axios";
import { auth } from "../auth/auth";
import "./Checkout.css";

export default function Checkout() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountFixed, setDiscountFixed] = useState(0);

  // Cargar productos y cupón del carrito
  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCartItems(storedCart);
    setCouponCode(localStorage.getItem("couponCode") || "");
    setDiscountPercent(
      Number(localStorage.getItem("discountPercent") || 0) / 100
    );
    setDiscountFixed(Number(localStorage.getItem("discountFixed") || 0));
  }, []);

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

  const handlePayment = async (e) => {
    e.preventDefault();
    setError("");

    const cleanCardNumber = DOMPurify.sanitize(cardNumber.replace(/\s+/g, ""));
    const cleanCardName = DOMPurify.sanitize(cardName.trim());
    const cleanExpiry = DOMPurify.sanitize(expiry.trim());
    const cleanCvv = DOMPurify.sanitize(cvv.trim());

    if (!/^\d{16}$/.test(cleanCardNumber)) {
      setError("El número de tarjeta debe tener 16 dígitos.");
      return;
    }
    if (!cleanCardName || cleanCardName.length < 3) {
      setError("Ingresa un nombre válido en la tarjeta.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(cleanExpiry)) {
      setError("La fecha de expiración debe tener formato MM/AA.");
      return;
    }
    if (!/^\d{3,4}$/.test(cleanCvv)) {
      setError("El CVV debe tener 3 o 4 dígitos.");
      return;
    }

    const [exp_month_raw, exp_year_raw] = cleanExpiry
      .split("/")
      .map((v) => parseInt(v, 10));
    const exp_month = exp_month_raw;
    const exp_year = exp_year_raw < 100 ? 2000 + exp_year_raw : exp_year_raw;

    const orderData = {
      items: cartItems.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      })),
      payment: {
        cardNumber: cleanCardNumber,
        cardName: cleanCardName,
        exp_month,
        exp_year,
        cvv: cleanCvv,
      },
      coupon: couponCode || null,
    };

    setProcessing(true);

    try {
      const { data } = await api.post("/checkout", orderData, {
        headers: {
          Authorization: `Bearer ${auth.getAccess()}`,
          "Content-Type": "application/json",
        },
      });

      localStorage.removeItem("cart");
      localStorage.removeItem("couponCode");
      localStorage.removeItem("discountPercent");
      localStorage.removeItem("discountFixed");

      navigate("/orders", {
        state: { total, message: "Compra realizada con éxito" },
      });
    } catch (err) {
      console.error("❌ Error en checkout:", err.response || err);
      if (err.response?.data?.errors) {
        setError(
          `Error de validación: ${err.response.data.errors
            .map((e) => e.msg)
            .join(", ")}`
        );
      } else {
        setError(err.response?.data?.error || "Error al procesar la compra.");
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <h1>Finalizar Compra</h1>
        <button className="checkout-back" onClick={() => navigate(-1)}>
          ← Volver
        </button>
      </div>

      <div className="checkout-layout">
        {/* -------- INFORMACIÓN DE PAGO -------- */}
        <div className="checkout-payment">
          <h3>
            💳 <span>Información de Pago</span>
          </h3>

          <div className="checkout-warning">
            ⚠️ <strong>Simulación de Pago - Solo para Fines Educativos</strong>
            <p>
              Este es un sistema de pago simulado. No se procesan pagos reales.
              Usa cualquier tarjeta de 16 dígitos válida (ej. 4242 4242 4242 4242).
            </p>
          </div>

          <form onSubmit={handlePayment}>
            <label>Número de Tarjeta</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="1234 5678 9012 3456"
              maxLength="19"
              value={cardNumber}
              onChange={(e) =>
                setCardNumber(e.target.value.replace(/[^\d\s]/g, ""))
              }
              required
            />

            <label>Nombre en la Tarjeta</label>
            <input
              type="text"
              placeholder="JUAN PEREZ"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              required
            />

            <div className="checkout-row">
              <div className="checkout-field">
                <label>Fecha de Expiración</label>
                <input
                  type="text"
                  placeholder="MM/AA"
                  maxLength="5"
                  value={expiry}
                  onChange={(e) =>
                    setExpiry(
                      e.target.value
                        .replace(/[^0-9/]/g, "")
                        .replace(/^(\d{2})(\d)/, "$1/$2")
                    )
                  }
                  required
                />
              </div>

              <div className="checkout-field">
                <label>CVV</label>
                <input
                  type="password"
                  placeholder="123"
                  maxLength="4"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ""))}
                  required
                />
              </div>
            </div>

            {error && <div className="checkout-error">{error}</div>}

            <button
              type="submit"
              className="checkout-pay-btn"
              disabled={processing}
            >
              {processing
                ? "Procesando..."
                : `Pagar ${formatPrice(total)}${
                    couponCode ? " (con descuento)" : ""
                  }`}
            </button>
          </form>
        </div>

        {/* -------- RESUMEN DEL PEDIDO -------- */}
        <div className="checkout-summary">
          <h3>Resumen del Pedido</h3>
          <ul>
            {cartItems.map((item) => (
              <li key={item.id}>
                <span>
                  {item.name} x{item.quantity}
                </span>
                <span>{formatPrice(item.price_cents * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <hr />
          <p>Subtotal: {formatPrice(subtotal)}</p>

          {couponCode && (
            <p style={{ color: "green" }}>
              Cupón aplicado: <strong>{couponCode}</strong>
            </p>
          )}

          {discountPercent > 0 && (
            <p>Descuento: -{formatPrice(subtotal * discountPercent)}</p>
          )}
          {discountFixed > 0 && <p>Descuento: -{formatPrice(discountFixed)}</p>}

          <div className="summary-total">
            <span>Total a Pagar</span>
            <span>{formatPrice(total)}</span>
          </div>

          <div className="checkout-delivery">
            <strong>Información de Entrega:</strong>
            <p>
              Recoge tu pedido en: <br />
              <em>Arepabuelas de la Esquina, Ventaquemada, Boyacá</em>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
