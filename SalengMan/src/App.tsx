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
import ConfirmPost from "./pages/sell/ConfirmPost";
import PostTrash from "./pages/trash/PostTrash";
import History from "./pages/history/History";
import PostDetail from "./pages/history/PostDetail";
import TrackDriver from "./pages/history/TrackDriver";
import PostBuyerList from "./pages/history/PostBuyerList";
import ConfirmBuyer from "./pages/history/ConfirmBuyer";
import Chat from "./pages/history/Chat";
import Notify from "./pages/notify/Notify";
import Account from "./pages/account/Account";
import AddAddress from "./pages/account/AddAddress";
import NewAddress from "./pages/account/NewAddress";
import Settings from "./pages/settings/Settings";
import HistoryCoin from "./pages/trash/coin/HistoryCoin";
import { UserProvider, useUser } from "./context/UserContext";
import { SellProvider } from "./context/SellContext";
import { ProtectedRoute, PublicRoute } from "./components/RouteGuards";
import Coin from "./pages/trash/coin/Coin";

import ConfirmBuyCoin from "./pages/trash/coin/ConfirmBuyCoin";

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
        <Route path="/sell/confirm" element={<ConfirmPost />} />
        <Route path="/trash" element={<PostTrash />} />
        <Route path="/coin" element={<Coin />} />
        <Route path="/coin/confirm" element={<ConfirmBuyCoin />} />
        <Route path="/coin/history" element={<HistoryCoin />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:id" element={<PostDetail />} />
        <Route path="/history/:id/track" element={<TrackDriver />} />
        <Route path="/history/:id/buyers" element={<PostBuyerList />} />
        <Route path="/history/buyer/:contactId" element={<ConfirmBuyer />} />
        <Route path="/chat/:id" element={<Chat />} />
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
        <SellProvider>
          <AppRoutes />
        </SellProvider>
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;
