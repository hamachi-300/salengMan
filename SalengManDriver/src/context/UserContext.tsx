import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthChange, getToken, logOut, User } from '../services/auth';
import { api } from '../config/api';
import { watchPosition, clearWatch } from '@tauri-apps/plugin-geolocation';

interface UserContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateUserLocal: (updates: Partial<User>) => void;
  currentLocation: { lat: number; lng: number } | null;
  setCurrentLocation: (loc: { lat: number; lng: number }) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocationState] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch fresh user data from API
  const refreshUser = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const freshUser = await api.getMe(token) as User;

      // Auto-logout if role changed to non-driver
      if (freshUser.role !== 'driver') {
        await logOut();
        setUser(null);
        return;
      }

      setUser(freshUser);
      // Update localStorage cache
      localStorage.setItem('auth_user', JSON.stringify(freshUser));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  // Update user locally without API call
  const updateUserLocal = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('auth_user', JSON.stringify(updated));
      return updated;
    });
  };

  const setCurrentLocation = (loc: { lat: number; lng: number }) => {
    setCurrentLocationState(loc);
  };

  // Real-time location tracking for backend sync
  useEffect(() => {
    if (!user || user.role !== 'driver') return;

    let watchId: number | null = null;
    let syncInterval: any = null;
    let lastKnownLocation: { lat: number; lng: number } | null = null;

    const startTracking = async () => {
      const token = getToken();
      if (!token) return;

      const isTauri = !!(window as any).__TAURI_INTERNALS__;

      const onUpdate = (lat: number, lng: number) => {
        lastKnownLocation = { lat, lng };
        setCurrentLocationState({ lat, lng });
      };

      const fallbackToIp = async () => {
        console.log("Attempting IP-based location fallback (sync)...");
        try {
          const response = await fetch("https://ipapi.co/json/");
          const data = await response.json();
          if (data && data.latitude && data.longitude) {
            onUpdate(data.latitude, data.longitude);
          }
        } catch (ipError) {
          console.error("IP fallback failed in context:", ipError);
        }
      };

      if (isTauri) {
        try {
          // Explicitly request permissions
          const { requestPermissions } = await import('@tauri-apps/plugin-geolocation');
          await requestPermissions(['location']);

          watchId = await watchPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }, (pos, err) => {
            if (err) {
              console.error("Tauri location track error:", err);
              // Only fallback to IP if we don't have a location yet or it's a critical error
              if (!lastKnownLocation) fallbackToIp();
            }
            if (pos) onUpdate(pos.coords.latitude, pos.coords.longitude);
          });
        } catch (e) {
          console.warn("Tauri watchPosition failed in context:", e);
          fallbackToIp();
        }
      } else if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => onUpdate(pos.coords.latitude, pos.coords.longitude),
          (err) => {
            console.error("Web watchPosition error:", err);
            if (!lastKnownLocation) fallbackToIp();
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        ) as unknown as number;
      } else {
        fallbackToIp();
      }

      // Sync to database every 5 seconds
      syncInterval = setInterval(async () => {
        if (lastKnownLocation) {
          try {
            const currentToken = getToken();
            if (currentToken) {
              await api.updateDriverLocation(currentToken, lastKnownLocation.lat, lastKnownLocation.lng);
              console.log("Driver location synced to database:", lastKnownLocation);
            }
          } catch (error) {
            console.error("Failed to sync location to database:", error);
          }
        }
      }, 5000);
    };

    startTracking();

    return () => {
      if (watchId !== null) {
        const isTauri = !!(window as any).__TAURI_INTERNALS__;
        if (isTauri) clearWatch(watchId);
        else navigator.geolocation.clearWatch(watchId as unknown as number);
      }
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (authUser) => {
      // Auto-logout non-driver users
      if (authUser && authUser.role !== 'driver') {
        await logOut();
        setUser(null);
      } else {
        setUser(authUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, updateUserLocal, currentLocation, setCurrentLocation }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
