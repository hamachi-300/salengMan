import { useState, useEffect } from "react";
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
import Token from "./pages/token/Token";
import QRPayment from "./pages/token/QRPayment";
import PaymentFlow from "./pages/token/PaymentFlow";
import { onAuthChange } from "./services/auth";
import { User } from "firebase/auth";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Splash />} />
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
          path="/token"
          element={user ? <Token /> : <Navigate to="/signin" />}
        />
        <Route
          path="/qr-payment"
          element={user ? <QRPayment /> : <Navigate to="/signin" />}
        />
        <Route
          path="/payment-flow"
          element={user ? <PaymentFlow /> : <Navigate to="/signin" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
