import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import DOMPurify from "dompurify";
import "./ProductDetail.css";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState(5);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  // Obtener datos del producto
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/products/${id}`);
        setProduct(res.data);
      } catch (err) {
        console.error("Error al obtener el producto:", err);
      }
    };

    const fetchComments = async () => {
      try {
        const res = await api.get(`/comments/${id}`);
        setComments(res.data || []);
      } catch (err) {
        console.error("Error al obtener comentarios:", err);
      }
    };

    fetchProduct();
    fetchComments();
  }, [id]);

  // Manejar envío de comentario
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    setError("");

    const sanitizedComment = DOMPurify.sanitize(commentText.trim());
    if (!sanitizedComment) {
      setError("El comentario no puede estar vacío.");
      return;
    }

    try {
      setPosting(true);
      await api.post(`/comments/${id}`, {
        rating: commentRating,
        text: sanitizedComment,
      });

      const res = await api.get(`/comments/${id}`);
      setComments(res.data || []);
      setCommentText("");
      setCommentRating(5);
    } catch (err) {
      console.error("Error al enviar comentario:", err);
      setError("Error al publicar el comentario.");
    } finally {
      setPosting(false);
    }
  };

  // ✅ NUEVA FUNCIÓN: Agregar al carrito
  const addToCart = () => {
    if (!product) return;

    try {
      const storedCart = JSON.parse(localStorage.getItem("cart")) || [];

      const existing = storedCart.find((item) => item.id === product.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        storedCart.push({
          id: product.id,
          name: product.name,
          image_url: product.image_url || product.image,
          price_cents: product.price_cents,
          quantity: 1,
        });
      }

      localStorage.setItem("cart", JSON.stringify(storedCart));
      setAdded(true);

      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      console.error("Error al agregar al carrito:", err);
    }
  };

  const formatPrice = (value) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);

  if (!product) {
    return <p style={{ textAlign: "center" }}>Cargando producto...</p>;
  }

  return (
    <div className="pd-container">
      <button className="pd-back" onClick={() => navigate(-1)}>
        ← Volver
      </button>

      <div className="pd-main">
        <div className="pd-image">
          <img src={product.image_url || product.image} alt={product.name} />
        </div>

        <div className="pd-info">
          <span className="pd-tag">Especiales</span>
          <h1>{product.name}</h1>
          <p className="pd-description">{product.description}</p>

          <p className="pd-price">{formatPrice(product.price_cents)}</p>

          <button className="pd-cart-btn" onClick={addToCart}>
            🛒 {added ? "Agregado ✅" : "Agregar al carrito"}
          </button>
        </div>
      </div>

      {/* Sección de Comentarios */}
      <section className="pd-comments">
        <h2 className="pd-comments-title">Comentarios</h2>

        <div className="pd-comment-box">
          <form onSubmit={handleSubmitComment}>
            <div className="pd-rating-input">
              <label>Calificación</label>
              <div className="pd-stars">
                {[1, 2, 3, 4, 5].map((num) => (
                  <span
                    key={num}
                    className={num <= commentRating ? "star filled" : "star"}
                    onClick={() => setCommentRating(num)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            <div className="pd-textarea">
              <label>Tu comentario</label>
              <textarea
                placeholder="Cuéntanos tu experiencia..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={1000}
              />
            </div>

            {error && <div className="pd-error">{error}</div>}

            <button type="submit" disabled={posting} className="pd-publish">
              {posting ? "Publicando..." : "Publicar comentario"}
            </button>
          </form>
        </div>

        <div className="pd-comments-list">
          {comments.length === 0 ? (
            <p className="pd-no-comments">
              Aún no hay comentarios. ¡Sé el primero!
            </p>
          ) : (
            comments.map((c) => (
              <div
                className="pd-comment"
                key={c.id || `${c.user}_${c.created_at}`}
              >
                <div className="pd-comment-head">
                  <strong>{c.user_name || "Usuario"}</strong>
                  <span className="pd-comment-date">
                    {new Date(c.created_at).toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="pd-comment-rating">
                  {"★".repeat(c.rating || 0)}{"☆".repeat(5 - (c.rating || 0))}
                </div>
                <p className="pd-comment-text">{c.text}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
