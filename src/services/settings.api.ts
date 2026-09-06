import { apiRequest } from './api';

export type AppSettings = {
  store: { isClosed: boolean; closedMessage: string };
  help: { phone: string; whatsapp: string; email: string };
  delivery: { deliveryCharge: number; freeDeliveryAbove: number; minimumOrderAmount: number };
};

export async function getAppSettings() {
  return apiRequest<{ success: boolean; data: AppSettings }>('/settings', {
    method: 'GET',
  });
}