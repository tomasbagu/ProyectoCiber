import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import AdminPanel from "./pages/AdminPanel";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* PÁGINA PRINCIPAL */}
        <Route path="/" element={<Home />} />

        {/* TIENDA (dos rutas que muestran lo mismo) */}
        <Route path="/products" element={<Products />} />
        <Route path="/tienda" element={<Products />} />

        {/* DETALLE DE PRODUCTO */}
        <Route path="/product/:id" element={<ProductDetail />} />

        {/* AUTENTICACIÓN */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* CARRITO Y CHECKOUT */}
        <Route path="/cart" element={<Cart />} />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />

        {/* PANEL ADMIN (solo admin) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* RUTAS “DE RELLENO” DEL MENÚ PARA QUE NO ROMPAN */}
        <Route path="/acerca-de" element={<Home />} />
        <Route path="/blog" element={<Home />} />
        <Route path="/contacto" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
