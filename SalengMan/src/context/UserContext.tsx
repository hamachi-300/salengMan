import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthChange, getToken, logOut, User } from '../services/auth';
import { api } from '../config/api';

interface UserContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateUserLocal: (updates: Partial<User>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch fresh user data from API
  const refreshUser = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const freshUser = await api.getMe(token) as User;

      // Auto-logout if role changed to non-seller
      if (freshUser.role !== 'seller') {
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

  useEffect(() => {
    const unsubscribe = onAuthChange(async (authUser) => {
      // Auto-logout non-seller users
      if (authUser && authUser.role !== 'seller') {
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
    <UserContext.Provider value={{ user, loading, refreshUser, updateUserLocal }}>
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
