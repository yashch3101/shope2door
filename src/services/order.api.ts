import { apiRequest } from './api';
import { getAccessToken } from './auth.storage';

// =====================================================
// ORDER STATUS
// =====================================================

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'DISPATCHED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUNDED';

// =====================================================
// ORDER ITEM
// =====================================================

export interface OrderItem {
  id: string;
  productId: string;

  // Backend actual fields
  productName?: string | null;
  productSku?: string | null;
  productImage?: string | null;

  quantity: number;

  unitPrice?: number | string;
  mrp: number | string;

  total: number | string;

  unit?: string | null;
  weight?: string | null;

  // Compatibility fields
  name?: string;
  price?: number | string;
  image?: string | null;
}

// =====================================================
// ORDER ADDRESS
// =====================================================

export interface OrderAddress {
  id: string;

  name: string;
  phone: string;

  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;

  city: string;
  state: string;
  pincode: string;
}

// =====================================================
// ORDER
// =====================================================

export interface Order {
  id: string;
  orderNumber?: string | null;

  userId: string;

  addressId: string;

  status: OrderStatus;

  subtotal: number | string;
  discount?: number | string;
  deliveryFee?: number | string;
  tax?: number | string;
  total: number | string;

  couponCode?: string | null;

  notes?: string | null;

  createdAt: string;
  updatedAt: string;

  items?: OrderItem[];

  address?: OrderAddress | null;

  payments?: unknown[];

  coupon?: unknown | null;
}

// =====================================================
// CREATE ORDER PAYLOAD
// =====================================================

export interface CreateOrderPayload {
  addressId: string;
  couponCode?: string;
  notes?: string;
}

// =====================================================
// CREATE ORDER RESPONSE
// =====================================================

export interface OrderResponse {
  success: boolean;
  message: string;
  data: Order;
}

// =====================================================
// MY ORDERS RESPONSE
// IMPORTANT:
// Backend returns:
// {
//   success: true,
//   message: "...",
//   data: orders
// }
// =====================================================

export interface MyOrdersResponse {
  success: boolean;
  message: string;
  data: Order[];
}

// =====================================================
// CREATE ORDER
// POST /api/v1/orders
// =====================================================

export async function createOrder(
  payload: CreateOrderPayload,
): Promise<OrderResponse> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to place an order');
  }

  return apiRequest<OrderResponse>(
    '/orders',
    {
      method: 'POST',
      token: accessToken,
      body: payload,
    },
  );
}

// =====================================================
// GET MY ORDERS
// GET /api/v1/orders/my
// =====================================================

export async function getMyOrders(
  status?: OrderStatus,
): Promise<MyOrdersResponse> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to view your orders');
  }

  const query = status
    ? `?status=${encodeURIComponent(status)}`
    : '';

  return apiRequest<MyOrdersResponse>(
    `/orders/my${query}`,
    {
      method: 'GET',
      token: accessToken,
    },
  );
}

// =====================================================
// GET SINGLE ORDER
// GET /api/v1/orders/my/:id
// =====================================================

export async function getMyOrder(
  orderId: string,
): Promise<OrderResponse> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to view this order');
  }

  return apiRequest<OrderResponse>(
    `/orders/my/${encodeURIComponent(orderId)}`,
    {
      method: 'GET',
      token: accessToken,
    },
  );
}

// =====================================================
// CANCEL ORDER
// POST /api/v1/orders/:id/cancel
// =====================================================

export async function cancelOrder(
  orderId: string,
): Promise<OrderResponse> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to cancel this order');
  }

  return apiRequest<OrderResponse>(
    `/orders/${encodeURIComponent(orderId)}/cancel`,
    {
      method: 'POST',
      token: accessToken,
    },
  );
}