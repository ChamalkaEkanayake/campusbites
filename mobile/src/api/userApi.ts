import apiClient from './client';

export interface UserItem {
  _id: string;
  name: string;
  username?: string;
  email?: string;
  phone?: string;
  gender?: string;
  studentId?: string;
  role: 'student' | 'chef' | 'admin';
  isAdmin: boolean;
  isVerified?: boolean;
  profilePicture?: string;
  createdAt?: string;
}

export const userApi = {
  async getUsers(role?: string, search?: string): Promise<UserItem[]> {
    const params: any = {};
    if (role && role !== 'all') params.role = role;
    if (search) params.search = search;
    const res = await apiClient.get('/auth/users', { params });
    return res.data;
  },

  async toggleVerification(userId: string, isVerified?: boolean): Promise<{ message: string; isVerified: boolean }> {
    const res = await apiClient.put(`/auth/users/${userId}/verify`, { isVerified });
    return res.data;
  }
};
