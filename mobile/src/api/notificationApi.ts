import apiClient from './client';

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  relatedOrderId: string | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export const notificationApi = {
  /** Fetch all notifications for authenticated user (paginated) */
  getNotifications: async (page = 1, limit = 20): Promise<NotificationsResponse> => {
    const response = await apiClient.get(`/notifications?page=${page}&limit=${limit}`);
    return response.data;
  },

  /** Get unread notification count */
  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  /** Mark a single notification as read */
  markAsRead: async (id: string): Promise<{ success: boolean; notification: Notification }> => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  /** Mark all notifications as read */
  markAllAsRead: async (): Promise<{ success: boolean; modifiedCount: number }> => {
    const response = await apiClient.patch('/notifications/mark-all-read');
    return response.data;
  },

  /** Delete a notification */
  deleteNotification: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  }
};
