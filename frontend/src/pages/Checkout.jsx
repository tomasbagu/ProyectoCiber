import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
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

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCartItems(storedCart);
  }, []);

  const subtotal = cartItems.reduce(
    (acc, item) => acc + (item.price_cents || 0) * (item.quantity || 1),
    0
  );

  const formatPrice = (value) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);

  const handlePayment = (e) => {
    e.preventDefault();
    setError("");

    // Limpieza y validaciones básicas
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

    setProcessing(true);

    setTimeout(() => {
      localStorage.removeItem("cart");
      setProcessing(false);
      navigate("/success", { state: { total: subtotal } });
    }, 2000);
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
        {/* --------- INFORMACIÓN DE PAGO --------- */}
        <div className="checkout-payment">
          <h3>
            💳 <span>Información de Pago</span>
          </h3>

          <div className="checkout-warning">
            ⚠️ <strong>Simulación de Pago - Solo para Fines Educativos</strong>
            <p>
              Este es un sistema de pago simulado. No se procesarán pagos
              reales. Puedes usar cualquier número de tarjeta de 16 dígitos para
              probar.
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
                  onChange={(e) =>
                    setCvv(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  required
                />
              </div>
            </div>

            {error && <div className="checkout-error">{error}</div>}

            <button type="submit" className="checkout-pay-btn" disabled={processing}>
              {processing ? "Procesando..." : `Pagar ${formatPrice(subtotal)}`}
            </button>
          </form>
        </div>

        {/* --------- RESUMEN DEL PEDIDO --------- */}
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
          <div className="summary-total">
            <span>Total a Pagar</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          <div className="checkout-delivery">
            <strong>Información de Entrega:</strong>
            <p>
              Recoge tu pedido en: <br />
              <em>
                Arepabuelas de la Esquina, Ventaquemada, Boyacá
              </em>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
