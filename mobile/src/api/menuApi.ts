import apiClient from './client';

export interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: 'Breakfast' | 'Lunch' | 'Snacks' | 'Beverages';
  image: string;
  isAvailable: boolean;
  preparationTimeMinutes: number;
  dailyStock: number;
  createdAt?: string;
  updatedAt?: string;
}

export const menuApi = {
  async getMenuItems(category?: string, search?: string): Promise<MenuItem[]> {
    const params: any = {};
    if (category && category !== 'All') params.category = category;
    if (search) params.search = search;
    const res = await apiClient.get('/menu-items', { params });
    return res.data;
  },

  async getMenuItemById(id: string): Promise<MenuItem> {
    const res = await apiClient.get(`/menu-items/${id}`);
    return res.data;
  },

  // FormData uploads — Content-Type is handled automatically by client.ts interceptor
  async createMenuItem(formData: FormData): Promise<MenuItem> {
    const res = await apiClient.post('/menu-items', formData);
    return res.data;
  },

  async updateMenuItem(id: string, formData: FormData): Promise<MenuItem> {
    const res = await apiClient.put(`/menu-items/${id}`, formData);
    return res.data;
  },

  async deleteMenuItem(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete(`/menu-items/${id}`);
    return res.data;
  }
};
