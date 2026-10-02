import apiClient from './client';
import { Order } from './orderApi';

export interface CreateCheckoutSessionPayload {
  menuItemId: string;
  quantity: number;
  breakTimeSlot: string;
  specialInstructions?: string;
}

export interface CheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
  orderId: string;
}

export interface VerifySessionResponse {
  success: boolean;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  order: Order;
}

export const paymentApi = {
  async createCheckoutSession(payload: CreateCheckoutSessionPayload): Promise<CheckoutSessionResponse> {
    const res = await apiClient.post('/payments/create-checkout-session', payload);
    return res.data;
  },

  async verifySession(sessionId: string): Promise<VerifySessionResponse> {
    const res = await apiClient.get(`/payments/verify-session/${sessionId}`);
    return res.data;
  }
};
