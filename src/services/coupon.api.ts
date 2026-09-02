import { apiRequest } from './api';
import { getAccessToken } from './auth.storage';

// =====================================================
// COUPON TYPE
// =====================================================

export type CouponType =
  | 'PERCENTAGE'
  | 'FIXED';

// =====================================================
// COUPON
// =====================================================

export interface Coupon {
  id: string;

  code: string;

  description?: string | null;

  type: CouponType;

  value: number | string;

  minOrderAmount?: number | string | null;

  maxDiscount?: number | string | null;

  usageLimit?: number | null;

  usedCount?: number;

  startsAt?: string | null;

  expiresAt?: string | null;

  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;
}

// =====================================================
// AVAILABLE COUPONS RESPONSE
// =====================================================

export interface AvailableCouponsResponse {
  success: boolean;

  message: string;

  data: {
    coupons: Coupon[];
    count: number;
  };
}

// =====================================================
// VALIDATE COUPON
// =====================================================

export interface ValidateCouponPayload {
  code: string;
  cartAmount: number;
}

export interface ValidateCouponResponse {
  success: boolean;

  message: string;

  data: {
    valid: boolean;

    coupon: {
      id: string;
      code: string;
      type: CouponType;
      value: number | string;
      minOrderAmount?: number | string | null;
      maxDiscount?: number | string | null;
    };

    calculation: {
      cartAmount: number;
      discount: number;
      finalAmount: number;
    };
  };
}

// =====================================================
// GET AVAILABLE COUPONS
// GET /api/v1/coupons/available
// =====================================================

export async function getAvailableCoupons(): Promise<AvailableCouponsResponse> {
  const accessToken =
    await getAccessToken();

  if (!accessToken) {
    throw new Error(
      'Please login to view available coupons',
    );
  }

  return apiRequest<AvailableCouponsResponse>(
    '/coupons/available',
    {
      method: 'GET',
      token: accessToken,
    },
  );
}

// =====================================================
// VALIDATE COUPON
// POST /api/v1/coupons/validate
// =====================================================

export async function validateCoupon(
  payload: ValidateCouponPayload,
): Promise<ValidateCouponResponse> {
  const accessToken =
    await getAccessToken();

  if (!accessToken) {
    throw new Error(
      'Please login to apply a coupon',
    );
  }

  return apiRequest<ValidateCouponResponse>(
    '/coupons/validate',
    {
      method: 'POST',
      token: accessToken,
      body: payload,
    },
  );
}