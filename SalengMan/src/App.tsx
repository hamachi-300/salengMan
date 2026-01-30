import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

// นำเข้า Pages จากโครงสร้างโฟลเดอร์ใหม่
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
import ItemUpload from "./pages/sell/Sell";
import ItemSpecifyLocation from "./pages/ItemSpecifyLocation/ItemSpecifyLocation";
import ItemSelectSaveAddress from "./pages/SaveAddress/ItemSelectSaveAddress";

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
        
        {/* จัดการสิทธิ์การเข้าถึง: ถ้า login แล้วให้ไปหน้า home */}
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

        {/* หน้าที่ต้อง Login ก่อนถึงจะเข้าได้ */}
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

        {/* หน้า ItemUpload ที่คุณเพิ่มเข้ามา */}
        <Route 
          path="/ItemUpload" 
          element={user ? <ItemUpload /> : <Navigate to="/signin" />} 
        />

        {/* หน้า ItemSpecifyLocation สำหรับระบุที่อยู่จัดส่ง */}
        <Route 
          path="/ItemSpecifyLocation" 
          element={user ? <ItemSpecifyLocation /> : <Navigate to="/signin" />} 
        />
        <Route
          path="/ItemSelectSaveAddress"
          element={user ? <ItemSelectSaveAddress /> : <Navigate to="/signin" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;