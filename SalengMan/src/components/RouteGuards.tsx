import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../context/UserContext";

export function ProtectedRoute() {
  const { user } = useUser();
  return user ? <Outlet /> : <Navigate to="/signin" />;
}

export function PublicRoute() {
  const { user } = useUser();
  return user ? <Navigate to="/home" /> : <Outlet />;
}
