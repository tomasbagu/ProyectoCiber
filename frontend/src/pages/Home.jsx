import "./Home.css";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      {/* Sección principal */}
      <section className="hero">
        <h1 className="hero-title">Arepas Boyacenses Artesanales</h1>
        <p className="hero-subtitle">
          Tradición familiar de Ventaquemada. Hechas con amor por nuestras abuelas.
        </p>
        <button
          className="hero-button"
          onClick={() => navigate("/products")}
        >
          Explorar Productos →
        </button>
      </section>

      {/* Sección: Por qué elegirnos */}
      <section className="features">
        <h2>Por qué elegirnos</h2>
        <div className="feature-list">
          <div className="feature-item">
            <h3>Receta Tradicional</h3>
            <p>
              Preparadas con la receta original de nuestras abuelas boyacenses.
            </p>
          </div>
          <div className="feature-item">
            <h3>Ingredientes Frescos</h3>
            <p>
              Solo utilizamos ingredientes de la más alta calidad y frescura.
            </p>
          </div>
          <div className="feature-item">
            <h3>Entrega Rápida</h3>
            <p>
              Ordena online y recoge en nuestra esquina de siempre.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
