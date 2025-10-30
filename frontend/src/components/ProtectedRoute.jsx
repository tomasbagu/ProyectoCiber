import { Navigate } from "react-router-dom";
import { auth } from "../auth/auth";

export default function ProtectedRoute({ children, role }) {
  if (!auth.isAuthenticated()) return <Navigate to="/login" replace />;
  if (role && !auth.hasRole(role)) return <Navigate to="/" replace />;
  return children;
}
