import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthChange, getToken, logOut, User } from '../services/auth';
import { api } from '../config/api';
import { watchPosition, clearWatch } from '@tauri-apps/plugin-geolocation';

interface UserContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateUserLocal: (updates: Partial<User>) => void;
  initialLocation: { lat: number; lng: number } | null;
  setInitialLocation: (loc: { lat: number; lng: number }) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLocation, setInitialLocationState] = useState<{ lat: number; lng: number } | null>(null);

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

  const setInitialLocation = (loc: { lat: number; lng: number }) => {
    setInitialLocationState(loc);
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
        setInitialLocationState({ lat, lng });
      };

      if (isTauri) {
        try {
          watchId = await watchPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }, (pos, err) => {
            if (err) console.error("Tauri location track error:", err);
            if (pos) onUpdate(pos.coords.latitude, pos.coords.longitude);
          });
        } catch (e) {
          console.warn("Tauri watchPosition failed in context:", e);
        }
      } else if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition((pos) => {
          onUpdate(pos.coords.latitude, pos.coords.longitude);
        }) as unknown as number;
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
    <UserContext.Provider value={{ user, loading, refreshUser, updateUserLocal, initialLocation, setInitialLocation }}>
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
