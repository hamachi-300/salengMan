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

export interface Address {
  id: number;
  label: string;
  address: string; // Matches DB column
  phone?: string;
  is_default: boolean;
  icon: 'home' | 'office' | 'other';
  note?: string;
  lat?: number;
  lng?: number;
  province?: string;
  district?: string;
  sub_district?: string;
  zipcode?: string;
}

export interface CreateAddressData {
  label: string;
  phone: string;
  note?: string;
  address: string;
  lat: number;
  lng: number;
  is_default: boolean;
  province?: string;
  district?: string;
  sub_district?: string;
  zipcode?: string;
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

    if (!res.ok) {  // ← Check if status is 200-299
      throw new Error('Unauthorized');
    }

    console.log(res.ok);
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

  // Upload avatar image
  uploadFile: async (token: string, file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`${API_URL}/upload/avatar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Upload failed');
    }

    return res.json();
  },

  // Get Addresses (Real)
  getAddresses: async (token: string): Promise<Address[]> => {
    const res = await fetch(`${API_URL}/addresses`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      // Fallback mock
      console.warn("API /addresses failed, using fallback");
      return [
        {
          id: 1,
          label: "Home",
          address: "128/95 Moo 4, Soi Sukhumvit 42, Phra Khanong, Khlong Toei, Bangkok 24240",
          phone: "081-234-5678",
          is_default: true,
          icon: "home"
        }
      ];
    }
    return res.json();
  },

  // Create Address
  createAddress: async (token: string, data: CreateAddressData): Promise<Address> => {
    const res = await fetch(`${API_URL}/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create address');
    }

    return res.json();
  },

  // Set Default Address
  setDefaultAddress: async (token: string, id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/addresses/${id}/default`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Failed to set default address');
  },

  // Deprecated shim (removed as we updated the main methods)
  // Get Address (Single)
  getAddress: async (token: string, id: string): Promise<Address> => {
    const res = await fetch(`${API_URL}/addresses/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch address');
    return res.json();
  },

  // Update Address
  updateAddress: async (token: string, id: string, data: CreateAddressData): Promise<Address> => {
    const res = await fetch(`${API_URL}/addresses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update address');
    }
    return res.json();
  },

  // Delete Address
  deleteAddress: async (token: string, id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/addresses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete address');
    }
  },

  // Delete Account
  deleteAccount: async (token: string): Promise<void> => {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete account');
    }
  },

  // Create Old Item Post
  createPost: async (token: string, data: any): Promise<any> => {
    const res = await fetch(`${API_URL}/old-item-posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      // Try to parse JSON, if fails, use status text
      let errorMessage = 'Failed to create post';
      try {
        const error = await res.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        // If not JSON (e.g. HTML 413/404/500), use status text
        errorMessage = `Server Error: ${res.status} ${res.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return res.json();
  },

  // Get Old Item Posts
  getPosts: async (token: string): Promise<any[]> => {
    const res = await fetch(`${API_URL}/old-item-posts`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch posts');
    }

    return res.json();
  },

  getPostById: async (token: string, id: string): Promise<any> => {
    try {
      const res = await fetch(`${API_URL}/old-item-posts/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch post');
      }

      return res.json();
    } catch (error) {
      console.error("Error fetching post:", error);
      throw error;
    }
  },

  deletePost: async (token: string, id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/old-item-posts/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      },
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete post');
    }
  },

  updatePost: async (token: string, id: number, data: any): Promise<any> => {
    const res = await fetch(`${API_URL}/old-item-posts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      let errorMessage = 'Failed to update post';
      try {
        const error = await res.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = `Server Error: ${res.status} ${res.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return res.json();
  },
};
