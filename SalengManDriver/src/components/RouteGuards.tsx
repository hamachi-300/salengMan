import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { getToken, getStoredUser } from "../services/auth";

export function ProtectedRoute() {
  const { user, loading } = useUser();

  // While loading, check localStorage directly
  if (loading) {
    const token = getToken();
    const storedUser = getStoredUser();
    if (token && storedUser && storedUser.role === 'driver') {
      return <Outlet />;
    }
    return <div className="loading-screen">Loading...</div>;
  }

  // Only allow driver role to access protected routes
  if (!user || user.role !== 'driver') {
    // Double-check localStorage in case context hasn't updated yet
    const token = getToken();
    const storedUser = getStoredUser();
    if (token && storedUser && storedUser.role === 'driver') {
      return <Outlet />;
    }
    return <Navigate to="/signin" />;
  }

  return <Outlet />;
}

export function PublicRoute() {
  const { user, loading } = useUser();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  // Only redirect to home if user is a driver
  if (user && user.role === 'driver') {
    return <Navigate to="/home" />;
  }

  // Also check localStorage
  const token = getToken();
  const storedUser = getStoredUser();
  if (token && storedUser && storedUser.role === 'driver') {
    return <Navigate to="/home" />;
  }

  return <Outlet />;
}
