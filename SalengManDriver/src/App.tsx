import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Splash from "./pages/splash_signin/Splash";
import SignIn from "./pages/splash_signin/Signin";
import Signup from "./pages/splash_signin/Signup";
import Login from "./pages/splash_signin/Login";
import Home from "./pages/home/Home";
import { UserProvider, useUser } from "./context/UserContext";
import { ProtectedRoute, PublicRoute } from "./components/RouteGuards";

function AppRoutes() {
  const { loading } = useUser();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <Routes>
      {/* Public - accessible to everyone */}
      <Route path="/" element={<Splash />} />

      {/* Auth pages - redirect to /home if already logged in */}
      <Route element={<PublicRoute />}>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected pages - redirect to /signin if not logged in */}
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<Home />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;
