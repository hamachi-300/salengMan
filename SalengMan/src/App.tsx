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
import DriverProfile from "./pages/history/DriverProfile";
import Notify from "./pages/notify/Notify";
import NotifyMessage from "./pages/notify/NotifyMessage";
import Account from "./pages/account/Account";
import AddAddress from "./pages/account/AddAddress";
import NewAddress from "./pages/account/NewAddress";
import Settings from "./pages/settings/Settings";
import HelpSupport from "./pages/settings/HelpSupport";
import UserReport from "./pages/account/UserReport";
import HistoryCoin from "./pages/trash/coin/HistoryCoin";
import { UserProvider, useUser } from "./context/UserContext";
import { SellProvider } from "./context/SellContext";
import { ProtectedRoute, PublicRoute } from "./components/RouteGuards";
import Coin from "./pages/trash/coin/Coin";
import ConfirmBuyCoin from "./pages/trash/coin/ConfirmBuyCoin";
import EsgTrash from "./pages/esg/EsgTrash";
import Subscription from "./pages/esg/Subscription";
import SelectEsgAddress from "./pages/esg/SelectEsgAddress";
import SelectEsgDate from "./pages/esg/SelectEsgDate";
import EsgBill from "./pages/esg/EsgBill";
import ChooseDateDriver from "./pages/esg/ChooseDateDriver";
import EsgDriverList from "./pages/esg/EsgDriverList";
import EsgDriverConfirm from "./pages/esg/EsgDriverConfirm";
import EsgDisposeTrash from "./pages/esg/EsgDisposeTrash";
import EsgTrackDriver from "./pages/esg/EsgTrackDriver";
import EsgDriverDetail from "./pages/esg/EsgDriverDetail";
import EsgTrashTypeUser from "./pages/esg/EsgTrashTypeUser";
import EsgTaskHistory from "./pages/esg/EsgTaskHistory";
import EsgTaskDetail from "./pages/esg/EsgTaskDetail";
import EsgReport from "./pages/esg/EsgReport";
import ExecutiveSummary from "./pages/esg/ExecutiveSummary";
import AuditReport from "./pages/esg/AuditReport";

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
        <Route path="/esg/trash" element={<EsgTrash />} />
        <Route path="/esg/subscription" element={<Subscription />} />
        <Route path="/esg/select-address" element={<SelectEsgAddress />} />
        <Route path="/esg/select-date" element={<SelectEsgDate />} />
        <Route path="/esg/bill" element={<EsgBill />} />
        <Route path="/esg/choose-date-driver" element={<ChooseDateDriver />} />
        <Route path="/esg/drivers/:supId/:date" element={<EsgDriverList />} />
        <Route path="/esg/driver-confirm/:supId/:date/:driverId" element={<EsgDriverConfirm />} />
        <Route path="/esg/dispose-trash" element={<EsgDisposeTrash />} />
        <Route path="/esg/track-driver/:driverId/:taskId" element={<EsgTrackDriver />} />
        <Route path="/esg/driver-detail/:driverId" element={<EsgDriverDetail />} />
        <Route path="/esg/trash-type/:id" element={<EsgTrashTypeUser />} />
        <Route path="/esg/task-history" element={<EsgTaskHistory />} />
        <Route path="/esg/task-detail/:id" element={<EsgTaskDetail />} />
        <Route path="/esg/report" element={<EsgReport />} />
        <Route path="/esg/report/executive" element={<ExecutiveSummary />} />
        <Route path="/esg/report/audit" element={<AuditReport />} />
        <Route path="/coin" element={<Coin />} />
        <Route path="/coin/confirm" element={<ConfirmBuyCoin />} />
        <Route path="/coin/history" element={<HistoryCoin />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:id" element={<PostDetail />} />
        <Route path="/history/:id/track" element={<TrackDriver />} />
        <Route path="/history/:id/buyers" element={<PostBuyerList />} />
        <Route path="/history/buyer/:contactId" element={<ConfirmBuyer />} />
        <Route path="/driver-profile/:id" element={<DriverProfile />} />
        <Route path="/chat/:id" element={<Chat />} />
        <Route path="/notify" element={<Notify />} />
        <Route path="/notify/message" element={<NotifyMessage />} />
        <Route path="/account" element={<Account />} />
        <Route path="/add-address" element={<AddAddress />} />
        <Route path="/new-address" element={<NewAddress />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help-support" element={<HelpSupport />} />
        <Route path="/user-report" element={<UserReport />} />
      </Route>
    </Routes>
  );
}

import { useEffect } from "react";
import { notificationService } from "./services/notificationService";

function App() {
  useEffect(() => {
    notificationService.init();
    return () => notificationService.stopPolling();
  }, []);

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
