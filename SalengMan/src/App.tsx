import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Splash from "./pages/splash_signin/Splash";
import SignIn from "./pages/splash_signin/Signin";
import Signup from "./pages/splash_signin/Signup";
import Login from "./pages/splash_signin/Login";
import Home from "./pages/home/Home";
import Sell from "./pages/sell/Sell";
import Dispose from "./pages/dispose/Dispose";
import History from "./pages/history/History";
import Notify from "./pages/notify/Notify";
import Account from "./pages/account/Account";
import AddAddress from "./pages/account/AddAddress";
import NewAddress from "./pages/account/NewAddress";
import Settings from "./pages/settings/Settings";
import { UserProvider, useUser } from "./context/UserContext";

function AppRoutes() {
  const { user, loading } = useUser();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/new-address" element={<NewAddress />} />
      <Route path="/address/:id" element={<NewAddress />} />
      <Route
        path="/signin"
        element={user ? <Navigate to="/home" /> : <SignIn />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/home" /> : <Signup />}
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/home" /> : <Login />}
      />
      <Route
        path="/home"
        element={user ? <Home /> : <Navigate to="/signin" />}
      />
      <Route
        path="/sell"
        element={user ? <Sell /> : <Navigate to="/signin" />}
      />
      <Route
        path="/dispose"
        element={user ? <Dispose /> : <Navigate to="/signin" />}
      />
      <Route
        path="/history"
        element={user ? <History /> : <Navigate to="/signin" />}
      />
      <Route
        path="/notify"
        element={user ? <Notify /> : <Navigate to="/signin" />}
      />
      <Route
        path="/account"
        element={user ? <Account /> : <Navigate to="/signin" />}
      />
      <Route
        path="/add-address"
        element={user ? <AddAddress /> : <Navigate to="/signin" />}
      />
      <Route
        path="/new-address"
        element={user ? <NewAddress /> : <Navigate to="/signin" />}
      />
      <Route
        path="/settings"
        element={user ? <Settings /> : <Navigate to="/signin" />}
      />
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
