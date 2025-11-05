import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import NavbarLogged from "./components/NavbarLogged";
import { auth } from "./auth/auth";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import AdminPanel from "./pages/AdminPanel";
import Orders from "./pages/Orders";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(auth.isAuthenticated());

  // ✅ Escucha cambios en la sesión
  useEffect(() => {
    const updateSession = () => {
      setIsLoggedIn(auth.isAuthenticated());
    };

    window.addEventListener("sessionChange", updateSession);
    return () => window.removeEventListener("sessionChange", updateSession);
  }, []);

  return (
    <BrowserRouter>
      {isLoggedIn ? <NavbarLogged /> : <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/cart" element={<Cart />} />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
          <ProtectedRoute>
        <Orders />
        </ProtectedRoute>
       }
      />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminPanel />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
