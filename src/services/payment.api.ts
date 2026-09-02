import { apiRequest } from './api';
import { getAccessToken } from './auth.storage';

// =====================================================
// PAYMENT METHOD
// =====================================================

export type PaymentMethod =
  | 'COD'
  | 'ONLINE';

// =====================================================
// PAYMENT STATUS
// =====================================================

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

// =====================================================
// INITIATE PAYMENT
// =====================================================

export interface InitiatePaymentPayload {
  orderId: string;
  paymentMethod: PaymentMethod;
}

export interface InitiatePaymentData {
  paymentId: string;

  paymentMethod: PaymentMethod;

  status: PaymentStatus;

  amount: number;

  currency: string;

  razorpayOrderId?: string | null;

  razorpayKeyId?: string | null;
}

export interface InitiatePaymentResponse {
  success: boolean;
  message: string;
  data: InitiatePaymentData;
}

// =====================================================
// INITIATE PAYMENT
// POST /api/v1/payments/initiate
// =====================================================

export async function initiatePayment(
  payload: InitiatePaymentPayload,
): Promise<InitiatePaymentResponse> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to make payment');
  }

  return apiRequest<InitiatePaymentResponse>(
    '/payments/initiate',
    {
      method: 'POST',
      token: accessToken,
      body: payload,
    },
  );
}

// =====================================================
// VERIFY PAYMENT
// =====================================================

export interface VerifyPaymentPayload {
  orderId: string;

  razorpayOrderId: string;

  razorpayPaymentId: string;

  razorpaySignature: string;
}

export interface VerifyPaymentData {
  success?: boolean;

  paymentId?: string;

  orderId?: string;

  status?: PaymentStatus;

  message?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  data: VerifyPaymentData;
}

// =====================================================
// VERIFY PAYMENT
// POST /api/v1/payments/verify
// =====================================================

export async function verifyPayment(
  payload: VerifyPaymentPayload,
): Promise<VerifyPaymentResponse> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to verify payment');
  }

  return apiRequest<VerifyPaymentResponse>(
    '/payments/verify',
    {
      method: 'POST',
      token: accessToken,
      body: payload,
    },
  );
}

// =====================================================
// GET ORDER PAYMENTS
// GET /api/v1/payments/order/:orderId
// =====================================================

export async function getOrderPayments(
  orderId: string,
) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to view payment details');
  }

  return apiRequest<{
    success: boolean;
    message: string;
    data: unknown[];
  }>(
    `/payments/order/${encodeURIComponent(orderId)}`,
    {
      method: 'GET',
      token: accessToken,
    },
  );
}

// =====================================================
// GET SINGLE PAYMENT
// GET /api/v1/payments/:paymentId
// =====================================================

export async function getPayment(
  paymentId: string,
) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to view payment details');
  }

  return apiRequest<{
    success: boolean;
    message: string;
    data: unknown;
  }>(
    `/payments/${encodeURIComponent(paymentId)}`,
    {
      method: 'GET',
      token: accessToken,
    },
  );
}