import { apiRequest } from './api';
import { getAccessToken } from './auth.storage';

// =====================================================
// TYPES
// =====================================================

export type WishlistCategory = {
  id: string;
  name: string;
  slug: string;
};

export type WishlistProduct = {
  id: string;
  name: string;
  slug: string;

  price: number | string;
  mrp: number | string;

  images: string[];

  stock: number;
  isActive: boolean;

  unit?: string | null;
  weight?: string | null;
  brand?: string | null;
  sku?: string | null;
};

export type WishlistItem = {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;

  product: WishlistProduct & {
    category?: WishlistCategory;
  };
};

// =====================================================
// RESPONSE TYPES
// =====================================================

export type GetWishlistResponse = {
  success: boolean;
  message: string;
  data: {
    items: WishlistItem[];
    count: number;
  };
};

export type CheckWishlistResponse = {
  success: boolean;
  message: string;
  data: {
    productId: string;
    isInWishlist: boolean;
  };
};

export type AddWishlistResponse = {
  success: boolean;
  message: string;
  data: WishlistItem;
};

export type RemoveWishlistResponse = {
  success: boolean;
  message: string;
  data: {
    productId: string;
    removed: boolean;
    removedCount?: number;
  };
};

export type ClearWishlistResponse = {
  success: boolean;
  message: string;
  data: {
    removedCount: number;
  };
};

// =====================================================
// GET WISHLIST
// GET /wishlist
// =====================================================

export async function getWishlist(): Promise<GetWishlistResponse> {
  const token = await getAccessToken();

  return apiRequest<GetWishlistResponse>(
    '/wishlist',
    {
      method: 'GET',
      token: token || undefined,
    },
  );
}

// =====================================================
// CHECK PRODUCT
// GET /wishlist/:productId
// =====================================================

export async function checkWishlist(
  productId: string,
): Promise<CheckWishlistResponse> {
  const token = await getAccessToken();

  return apiRequest<CheckWishlistResponse>(
    `/wishlist/${encodeURIComponent(productId)}`,
    {
      method: 'GET',
      token: token || undefined,
    },
  );
}

// =====================================================
// ADD PRODUCT
// POST /wishlist/:productId
// =====================================================

export async function addToWishlist(
  productId: string,
): Promise<AddWishlistResponse> {
  const token = await getAccessToken();

  return apiRequest<AddWishlistResponse>(
    `/wishlist/${encodeURIComponent(productId)}`,
    {
      method: 'POST',
      token: token || undefined,
    },
  );
}

// =====================================================
// REMOVE PRODUCT
// DELETE /wishlist/:productId
// =====================================================

export async function removeFromWishlist(
  productId: string,
): Promise<RemoveWishlistResponse> {
  const token = await getAccessToken();

  return apiRequest<RemoveWishlistResponse>(
    `/wishlist/${encodeURIComponent(productId)}`,
    {
      method: 'DELETE',
      token: token || undefined,
    },
  );
}

// =====================================================
// CLEAR WISHLIST
// DELETE /wishlist
// =====================================================

export async function clearWishlist(): Promise<ClearWishlistResponse> {
  const token = await getAccessToken();

  return apiRequest<ClearWishlistResponse>(
    '/wishlist',
    {
      method: 'DELETE',
      token: token || undefined,
    },
  );
}