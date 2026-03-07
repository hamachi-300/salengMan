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
  user_phone?: string;
  address_phone?: string;
  role: string;
  avatar_url?: string;
  gender?: string;
  default_address?: string;
  created_at?: string;
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
  refer_id?: number | string;
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

  // Get Addresses for a specific user
  getAddressesByUserId: async (token: string, userId: string): Promise<Address[]> => {
    const res = await fetch(`${API_URL}/addresses/user/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      console.warn(`API /addresses/user/${userId} failed`);
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

  // Get user score
  getUserScore: async (token: string, userId: string): Promise<any> => {
    const res = await fetch(`${API_URL}/users/${userId}/score`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch user score');
    }

    return res.json();
  },

  // Submit a review
  reviewUser: async (token: string, userId: string, score: number, postId: number): Promise<any> => {
    const res = await fetch(`${API_URL}/users/${userId}/review`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ score, postId }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to submit review');
    }

    return res.json();
  },

  // Check review status
  checkReviewStatus: async (token: string, userId: string, postId: number): Promise<{ hasReviewed: boolean }> => {
    const res = await fetch(`${API_URL}/users/${userId}/review/check?postId=${postId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to check review status');
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

  // Clear all notifications
  clearNotifications: async (token: string): Promise<void> => {
    const res = await fetch(`${API_URL}/notifications`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to clear notifications');
    }
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

  // Submit problem report
  submitProblemReport: async (token: string, header: string, content: string, image?: string): Promise<any> => {
    const res = await fetch(`${API_URL}/reports/problem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ header, content, image }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to submit problem report');
    }

    return res.json();
  },

  // Submit user report
  submitUserReport: async (token: string, reported_user_id: string, header: string, content: string, image?: string): Promise<any> => {
    const res = await fetch(`${API_URL}/reports/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reported_user_id, header, content, image }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to submit user report');
    }

    return res.json();
  },

  // Check ESG Driver status
  checkEsgDriverStatus: async (token: string): Promise<{ isRegistered: boolean; driver?: any }> => {
    const res = await fetch(`${API_URL}/esg/driver/status`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to check ESG driver status');
    return res.json();
  },

  // Register as ESG Driver
  registerEsgDriver: async (token: string): Promise<{ success: boolean; driver: any }> => {
    const res = await fetch(`${API_URL}/esg/driver/register`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to register as ESG driver');
    return res.json();
  },

  // Get ESG Driver profile/dashboard stats
  getEsgDriverProfile: async (token: string): Promise<any> => {
    const res = await fetch(`${API_URL}/esg/driver/profile`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch ESG driver profile');
    return res.json();
  },

  // Get available ESG subscriptions for contracts
  getAvailableEsgSubscriptions: async (token: string, date?: number): Promise<any[]> => {
    const url = new URL(`${API_URL}/esg/available-subscriptions`);
    if (date) url.searchParams.append('date', date.toString());

    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch available subscriptions');
    return res.json();
  },

  // Sign ESG Contract with a subscriber
  signEsgContract: async (token: string, sup_id: string, date_index: number): Promise<{ success: boolean; warning?: string }> => {
    const res = await fetch(`${API_URL}/esg/driver/contract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ sup_id, date_index }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to sign ESG contract');
    }
    return res.json();
  },

  // Get next upcoming task for driver
  getEsgDriverNextTask: async (token: string): Promise<any> => {
    const res = await fetch(`${API_URL}/esg/tasks/driver/next`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch next task');
    return res.json();
  },

  // Get today's tasks for driver
  getEsgDriverTodayTasks: async (token: string): Promise<any> => {
    const res = await fetch(`${API_URL}/esg/tasks/driver/today`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch today tasks');
    return res.json();
  },

  // Get ESG task by ID
  getEsgTaskById: async (token: string, id: string): Promise<any> => {
    const res = await fetch(`${API_URL}/esg/tasks/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch task details');
    return res.json();
  },

  // Get all recycling factories
  getRecyclingAddresses: async (): Promise<any[]> => {
    const res = await fetch(`${API_URL}/recycling-addresses`);
    if (!res.ok) throw new Error('Failed to fetch recycling factories');
    return res.json();
  },

  // Complete ESG task
  completeEsgTask: async (token: string, id: string, data: { weight: any[]; carbon_reduce: number; tree_equivalent: number; recycling_center_addresss_id: string }): Promise<any> => {
    const res = await fetch(`${API_URL}/esg/tasks/${id}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to complete ESG task');
    }
    return res.json();
  },

  // Finalize ESG task (complete status)
  finalizeEsgTask: async (token: string, id: string, data: { evidences_images: string[]; receipt_images: string[] }): Promise<any> => {
    const res = await fetch(`${API_URL}/esg/tasks/${id}/finalize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to finalize ESG task');
    }
    return res.json();
  },

  // Get ESG driver task history (today and past)
  getEsgDriverTaskHistory: async (token: string): Promise<{ tasks: any[] }> => {
    const res = await fetch(`${API_URL}/esg/tasks/driver/history`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error("Failed to fetch driver task history");
    return res.json();
  },
};
