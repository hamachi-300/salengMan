import { ReactNode } from "react";
import { api } from "../config/api";

// Token storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// User type for our backend
export interface User {
  [x: string]: ReactNode;
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  avatar_url?: string;
  gender?: string;
  default_address?: string;
}

// Get stored token
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

// Get stored user
export const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

// Sign Up - create user
export const signUp = async (email: string, password: string, username: string, gender: string): Promise<User> => {
  const result = await api.register({
    email,
    password,
    full_name: username,
    gender,
    role: 'seller',
  });

  if (result.error) {
    throw new Error(result.error);
  }

  if (result.token && result.user) {
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));

    // Notify listeners
    authListeners.forEach(callback => callback(result.user as User));

    return result.user as User;
  }

  throw new Error('Registration failed');
};

// Sign In Result type
export interface SignInResult {
  user?: User;
  needsRoleSelection?: boolean;
  availableRoles?: string[];
}

// Sign In - login user
export const signIn = async (email: string, password: string, role?: string): Promise<SignInResult> => {
  const result = await api.login(email, password, role);

  // Multiple accounts found - need role selection
  if (result.available_roles && result.available_roles.length > 0) {
    return {
      needsRoleSelection: true,
      availableRoles: result.available_roles
    };
  }

  if (result.error) {
    throw new Error(result.error);
  }

  if (result.token && result.user) {
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));

    // Notify listeners
    authListeners.forEach(callback => callback(result.user as User));

    return { user: result.user as User };
  }

  throw new Error('Login failed');
};

// Sign Out
export const logOut = async (): Promise<void> => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  // Notify listeners
  authListeners.forEach(callback => callback(null));
};

// Password Reset (not implemented in backend yet)
export const resetPassword = async (email: string): Promise<void> => {
  console.log('Password reset requested for:', email);
  throw new Error('Password reset not implemented yet');
};

// Auth State Listeners
const authListeners: Set<(user: User | null) => void> = new Set();

// Check if user is authenticated on app load
const checkAuthOnLoad = async (): Promise<User | null> => {
  const token = getToken();
  const storedUser = getStoredUser();

  if (!token || !storedUser) {
    return null;
  }

  try {
    // Verify token is still valid
    const user = await api.getMe(token);
    if (user.id) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user as User;
    }
  } catch (error) {
    // Token invalid, clear storage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  return null;
};

// Auth State Listener (similar to Firebase onAuthStateChanged)
export const onAuthChange = (callback: (user: User | null) => void): (() => void) => {
  authListeners.add(callback);

  // Check current auth state
  checkAuthOnLoad().then(user => {
    callback(user);
  });

  // Return unsubscribe function
  return () => {
    authListeners.delete(callback);
  };
};
