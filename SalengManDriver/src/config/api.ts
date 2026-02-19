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
  available_roles?: string[];
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
  address: string;
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
  address: string;
  phone: string;
  is_default: boolean;
  note?: string;
  lat?: number;
  lng?: number;
  province?: string;
  district?: string;
  sub_district?: string;
  zipcode?: string;
}
export interface Notification {
  notify_id: number;
  notify_user_id: string;
  notify_header: string;
  notify_content: string;
  timestamp: string;
  type: string;
  refer_id?: number;
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
  login: (email: string, password: string, role?: string): Promise<AuthResponse> =>
    fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
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

  // Get Addresses
  getAddresses: async (token: string): Promise<Address[]> => {
    const res = await fetch(`${API_URL}/addresses`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      console.warn("API /addresses failed");
      return [];
    }
    return res.json();
  },

  // Get single address
  getAddress: async (token: string, id: string): Promise<Address> => {
    const res = await fetch(`${API_URL}/addresses/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch address');
    }
    return res.json();
  },

  // Create address
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
      throw new Error('Failed to create address');
    }
    return res.json();
  },

  // Update address
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
      throw new Error('Failed to update address');
    }
    return res.json();
  },

  // Delete address
  deleteAddress: async (token: string, id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/addresses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to delete address');
    }
  },

  // Get Posts (Orders for driver)
  getPosts: async (token: string): Promise<any[]> => {
    const res = await fetch(`${API_URL}/orders`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch orders');
    }

    return res.json();
  },

  // Get all available old item posts (for drivers)
  getAvailablePosts: async (token: string): Promise<any[]> => {
    const res = await fetch(`${API_URL}/old-item-posts/available/all`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch available posts');
    }

    return res.json();
  },

  // Get public user profile
  getPublicProfile: async (token: string, userId: string): Promise<UserResponse> => {
    const res = await fetch(`${API_URL}/users/${userId}/public`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch user profile');
    }

    return res.json();
  },

  // Delete user account
  deleteAccount: async (token: string): Promise<void> => {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to delete account');
    }
  },

  // Create contacts (driver initiates contact with sellers)
  createContacts: async (token: string, postIds: number[]): Promise<any[]> => {
    const res = await fetch(`${API_URL}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ post_ids: postIds }),
    });

    if (!res.ok) {
      throw new Error('Failed to create contacts');
    }

    return res.json();
  },

  // Get contacts for current user
  getContacts: async (token: string): Promise<any[]> => {
    const res = await fetch(`${API_URL}/contacts`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch contacts');
    }

    return res.json();
  },

  // Get single contact by ID
  getContact: async (token: string, contactId: string): Promise<any> => {
    const res = await fetch(`${API_URL}/contacts/${contactId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch contact');
    }

    return res.json();
  },

  // Update contact status
  updateContactStatus: async (token: string, contactId: string, status: string): Promise<any> => {
    const res = await fetch(`${API_URL}/contacts/${contactId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      throw new Error('Failed to update contact status');
    }

    return res.json();
  },

  // Delete contact
  deleteContact: async (token: string, contactId: string): Promise<any> => {
    const res = await fetch(`${API_URL}/contacts/${contactId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to delete contact');
    }

    return res.json();
  },

  // Cancel contact (with reason)
  cancelContact: async (token: string, contactId: string, reason: string): Promise<any> => {
    const res = await fetch(`${API_URL}/contacts/${contactId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to cancel contact');
    }

    return res.json();
  },

  // Get chat messages
  getChat: async (token: string, chatId: string): Promise<any> => {
    const res = await fetch(`${API_URL}/chats/${chatId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch chat');
    }

    return res.json();
  },

  // Send message
  sendMessage: async (token: string, chatId: string, text?: string, image?: string): Promise<any> => {
    const res = await fetch(`${API_URL}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ text, image }),
    });

    if (!res.ok) {
      throw new Error('Failed to send message');
    }

    return res.json();
  },

  // Get notifications
  getNotifications: async (token: string): Promise<Notification[]> => {
    const res = await fetch(`${API_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch notifications');
    }

    return res.json();
  },

  // Update driver real-time location
  updateDriverLocation: async (token: string, lat: number, lng: number): Promise<{ status: string }> => {
    const res = await fetch(`${API_URL}/driver-location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ lat, lng }),
    });

    if (!res.ok) {
      throw new Error('Failed to update driver location');
    }

    return res.json();
  },
};
