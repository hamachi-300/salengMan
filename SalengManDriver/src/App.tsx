import { getCurrentPosition } from '@tauri-apps/plugin-geolocation';
import { ReactNode, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import { ProtectedRoute, PublicRoute } from "./components/RouteGuards";
import { UserProvider, useUser } from "./context/UserContext";
import Account from "./pages/account/Account";
import AddAddress from "./pages/account/AddAddress";
import NewAddress from "./pages/account/NewAddress";
import BuyOldItem from "./pages/buy/buy-old-item/BuyOldItem";
import ConfirmCart from "./pages/buy/confirm-cart/ConfirmCart";
import ItemDetails from "./pages/buy/item-details/ItemDetails";
import SellerProfile from "./pages/buy/seller-profile/SellerProfile";
import ConfirmJob from "./pages/ConfirmJob/ConfirmJob";
import Chat from "./pages/history/Chat";
import ContactDetail from "./pages/history/ContactDetail";
import History from "./pages/history/History";
import Home from "./pages/home/Home";
import ContactList from "./pages/jobs/contact_list/ContactList";
import ExploreMap from "./pages/jobs/ExploreMap";
import Notify from "./pages/notify/Notify";
import Settings from "./pages/settings/Settings";
import Login from "./pages/splash_signin/Login";
import SignIn from "./pages/splash_signin/Signin";
import Signup from "./pages/splash_signin/Signup";
import Splash from "./pages/splash_signin/Splash";
import DriverTimeSlot from "./pages/TimeSlot/DriverTimeSlot";

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
        <Route path="/account" element={<Account />} />
        <Route path="/notify" element={<Notify />} />
        <Route path="/history" element={<History />} />
        <Route path="/chat/:id" element={<Chat />} />
        <Route path="/buy-old-item" element={<BuyOldItem />} />
        <Route path="/item-details/:id" element={<ItemDetails />} />
        <Route path="/contact/:id" element={<ContactDetail />} />
        <Route path="/confirm-cart" element={<ConfirmCart />} />
        <Route path="/seller/:id" element={<SellerProfile />} />
        <Route path="/add-address" element={<AddAddress />} />
        <Route path="/new-address" element={<NewAddress />} />
        <Route path="/edit-address/:id" element={<NewAddress />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/jobs/contacts" element={<ContactList />} />
        <Route path="/jobs/explore/:id" element={<ExploreMap />} />
        <Route path="/time-slot" element={<DriverTimeSlot />} />
        <Route path="/time-slot" element={<DriverTimeSlot />} />
        <Route path="/confirm-job" element={<ConfirmJob />} />
      </Route>
    </Routes>
  );
}

function LocationGuard({ children }: { children: ReactNode }) {
  const { setInitialLocation } = useUser();
  const [locationReady, setLocationReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const checkLocation = async () => {
    setChecking(true);
    setError(null);

    const isTauri = !!(window as any).__TAURI_INTERNALS__;

    if (isTauri) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Location check timed out")), 65000)
        );

        // Ask for permission explicitly first
        try {
          // Tauri geolocation plugin has a requestPermissions method defined
          const { requestPermissions } = await import('@tauri-apps/plugin-geolocation');
          const permissionStatus = await requestPermissions(['location', 'coarseLocation']);
          console.log("Permission status:", permissionStatus);
        } catch (e) {
          console.warn("Could not request permissions or already granted", e);
        }

        const pos = await Promise.race([
          getCurrentPosition({ enableHighAccuracy: true, timeout: 60000, maximumAge: 5000 }),
          timeoutPromise
        ]) as any;

        if (pos && pos.coords) {
          setInitialLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }

        setLocationReady(true);
        setChecking(false);
        return; // Success, exit early
      } catch (tauriError: any) {
        console.warn("Tauri location check failed, trying Web API fallback:", tauriError);
      }
    }

    // Fallback to Web Geolocation API
    try {
      if ("geolocation" in navigator) {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log("Web Geolocation success:", position);
              setInitialLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
              setLocationReady(true);
              resolve();
            },
            (webError) => {
              console.error("Web Geolocation error:", webError);
              reject(new Error(webError.message));
            },
            { enableHighAccuracy: true, timeout: 60000, maximumAge: 5000 }
          );
        });
      } else {
        throw new Error("Geolocation not supported on this device.");
      }
    } catch (webErr: any) {
      console.error("All location checks failed:", webErr);
      setError("Please enable GPS and allow location access to use the app.");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkLocation();
  }, []);

  if (checking) {
    return <div className="loading-screen">Checking Location...</div>;
  }

  if (error && !locationReady) {
    return (
      <div className="location-error-overlay">
        <div className="location-error-content">
          <svg viewBox="0 0 24 24" fill="currentColor" className="location-error-icon">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            <path d="M0 0h24v24H0z" fill="none" />
          </svg>
          <h2 className="location-error-title">GPS Required</h2>
          <p className="location-error-message">{error}</p>
          <button className="location-retry-button" onClick={checkLocation}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <LocationGuard>
          <AppRoutes />
        </LocationGuard>
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;
