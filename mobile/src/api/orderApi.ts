import apiClient from './client';
import { MenuItem } from './menuApi';
import { UserResponse } from './authApi';

export interface Order {
  _id: string;
  user: UserResponse;
  menuItem: MenuItem;
  quantity: number;
  totalAmount: number;
  breakTimeSlot: string;
  status: 'Pending' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled';
  specialInstructions?: string;
  paymentMethod?: 'ONLINE' | 'CASH_ON_PICKUP';
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paidAt?: string;
  receiptNumber?: string;
  pickupToken?: string;
  collectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  menuItemId: string;
  quantity: number;
  breakTimeSlot: string;
  specialInstructions?: string;
  paymentMethod?: 'ONLINE' | 'CASH_ON_PICKUP';
}

export interface ReceiptPayload {
  receiptNumber: string;
  pickupToken: string;
  orderId: string;
  orderDate: string;
  student: {
    name: string;
    studentId?: string | null;
    email?: string | null;
  };
  item: {
    name: string;
    category: string;
    unitPrice: number;
    quantity: number;
    total: number;
  };
  breakTimeSlot: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  stripePaymentIntentId?: string | null;
  paidAt?: string | null;
  collectedAt?: string | null;
  subtotal: number;
  totalPaid: number;
}

export interface VerifyPickupResponse {
  valid: boolean;
  reason?: 'INVALID_TOKEN' | 'ALREADY_COLLECTED' | 'CANCELLED';
  message?: string;
  collectedAt?: string;
  order?: {
    _id: string;
    receiptNumber?: string;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    breakTimeSlot: string;
    paidAt?: string;
    collectedAt?: string;
    item: { name: string; quantity: number; unitPrice: number; total: number };
    student: { name: string; studentId?: string | null; email?: string | null };
  };
}

export const orderApi = {
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const res = await apiClient.post('/orders', payload);
    return res.data;
  },

  async getMyOrders(): Promise<Order[]> {
    const res = await apiClient.get('/orders/my-orders');
    return res.data;
  },

  async getAllOrders(status?: string, breakTimeSlot?: string): Promise<Order[]> {
    const params: any = {};
    if (status) params.status = status;
    if (breakTimeSlot) params.breakTimeSlot = breakTimeSlot;
    const res = await apiClient.get('/orders', { params });
    return res.data;
  },

  async getOrderById(id: string): Promise<Order> {
    const res = await apiClient.get(`/orders/${id}`);
    return res.data;
  },

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const res = await apiClient.put(`/orders/${id}/status`, { status });
    return res.data;
  },

  async confirmCashPayment(id: string): Promise<Order> {
    const res = await apiClient.put(`/orders/${id}/confirm-cash-payment`);
    return res.data;
  },

  async cancelOrder(id: string): Promise<{ message: string; order: Order }> {
    const res = await apiClient.put(`/orders/${id}/cancel`);
    return res.data;
  },

  async generateReceipt(orderId: string): Promise<ReceiptPayload> {
    const res = await apiClient.post(`/orders/${orderId}/generate-receipt`);
    return res.data;
  },

  async getReceipt(orderId: string): Promise<ReceiptPayload> {
    const res = await apiClient.get(`/orders/${orderId}/receipt`);
    return res.data;
  },

  async verifyPickup(pickupToken: string): Promise<VerifyPickupResponse> {
    const res = await apiClient.post('/orders/verify-pickup', { pickupToken });
    return res.data;
  },

  async confirmPickup(orderId: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post(`/orders/${orderId}/confirm-pickup`);
    return res.data;
  }
};
