import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../context/UserContext";

export function ProtectedRoute() {
  const { user } = useUser();

  // Only allow driver role to access protected routes
  if (!user || user.role !== 'driver') {
    return <Navigate to="/signin" />;
  }

  return <Outlet />;
}

export function PublicRoute() {
  const { user } = useUser();

  // Only redirect to home if user is a driver
  if (user && user.role === 'driver') {
    return <Navigate to="/home" />;
  }

  return <Outlet />;
}
