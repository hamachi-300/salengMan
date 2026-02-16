// API URL from environment variable
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: string;
  gender?: string;
}

interface AuthResponse {
  user?: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
  token?: string;
  error?: string;
}

interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  avatar_url?: string;
  gender?: string;
  default_address?: string;
}

export const api = {
  // Health check
  health: (): Promise<{ status: string }> =>
    fetch(`${API_URL}/health`).then(res => res.json()),

  // Register
  register: (data: RegisterData): Promise<AuthResponse> =>
    fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => res.json()),

  // Login
  login: (email: string, password: string): Promise<AuthResponse> =>
    fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(res => res.json()),

  // Get current user
  getMe: async (token: string): Promise<UserResponse> => {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Unauthorized');
    }

    return res.json();
  },

  // Update user profile
  updateUser: async (token: string, data: Partial<UserResponse>): Promise<UserResponse> => {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error('Failed to update user');
    }

    return res.json();
  },
};
