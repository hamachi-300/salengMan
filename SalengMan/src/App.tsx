import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Splash from "./pages/splash_signin/Splash";
import SignIn from "./pages/splash_signin/Signin";
import Signup from "./pages/splash_signin/Signup";
import Login from "./pages/splash_signin/Login";
import Home from "./pages/home/Home";
import Sell from "./pages/sell/Sell";
import SelectAddress from "./pages/sell/SelectAddress";
import SelectTime from "./pages/sell/SelectTime";
import Confirm from "./pages/sell/Confirm";
import Dispose from "./pages/dispose/Dispose";
import History from "./pages/history/History";
import Notify from "./pages/notify/Notify";
import Account from "./pages/account/Account";
import AddAddress from "./pages/account/AddAddress";
import NewAddress from "./pages/account/NewAddress";
import Settings from "./pages/settings/Settings";
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
      <Route path="/address/:id" element={<NewAddress />} />

      {/* Auth pages - redirect to /home if already logged in */}
      <Route element={<PublicRoute />}>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected pages - redirect to /signin if not logged in */}
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<Home />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/sell/select-address" element={<SelectAddress />} />
        <Route path="/sell/select-time" element={<SelectTime />} />
        <Route path="/sell/confirm" element={<Confirm />} />
        <Route path="/dispose" element={<Dispose />} />
        <Route path="/history" element={<History />} />
        <Route path="/notify" element={<Notify />} />
        <Route path="/account" element={<Account />} />
        <Route path="/add-address" element={<AddAddress />} />
        <Route path="/new-address" element={<NewAddress />} />
        <Route path="/settings" element={<Settings />} />
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
