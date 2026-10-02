import apiClient from './client';

export interface RegisterPayload {
  name?: string;
  username?: string;
  email?: string;
  password: string;
  phone?: string;
  gender?: string;
  studentId?: string;
  role?: 'student' | 'chef' | 'admin';
  isAdmin?: boolean;
}

export interface LoginPayload {
  email?: string;
  username?: string;
  password: string;
}

export interface UserResponse {
  _id: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  gender?: string;
  studentId?: string;
  role?: string;
  isAdmin: boolean;
  isVerified?: boolean;
  profilePicture?: string;
  token?: string;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<UserResponse> {
    const res = await apiClient.post('/auth/register', payload);
    return res.data;
  },

  async login(payload: LoginPayload): Promise<UserResponse> {
    const res = await apiClient.post('/auth/login', payload);
    return res.data;
  },

  async getProfile(): Promise<UserResponse> {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  async uploadProfilePicture(formData: FormData): Promise<UserResponse> {
    const res = await apiClient.put('/auth/profile/picture', formData);
    return res.data;
  }
};
