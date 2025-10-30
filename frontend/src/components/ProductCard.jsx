import { Link } from "react-router-dom";

export default function ProductCard({ p, onAdd }) {
  return (
    <div style={{border:"1px solid #eee", borderRadius:8, padding:12}}>
      <img src={p.imageUrl} alt={p.name} style={{width:"100%", height:160, objectFit:"cover", borderRadius:6}}/>
      <h3>{p.name}</h3>
      <p>${(p.price_cents/100).toLocaleString("es-CO")}</p>
      <div style={{display:"flex", gap:8}}>
        <Link to={`/product/${p.id}`}>Ver</Link>
        <button onClick={() => onAdd?.(p)}>Agregar</button>
      </div>
    </div>
  );
}
