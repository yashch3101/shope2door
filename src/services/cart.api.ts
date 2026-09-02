import { apiRequest } from './api';
import { getAccessToken } from './auth.storage';

// =====================================================
// CART PRODUCT
// =====================================================

export interface CartItem {
  id: string;
  productId: string;

  name: string;
  slug: string;

  quantity: number;

  price: number;
  mrp: number;

  itemTotal: number;
  itemMrpTotal: number;

  stock: number;

  unit?: string | null;
  weight?: string | null;

  images: string[];

  isActive: boolean;

  categoryId: string;
}

// =====================================================
// CART SUMMARY
// =====================================================

export interface CartSummary {
  totalItems: number;
  subtotal: number;
  totalMrp: number;
  totalSavings: number;
}

// =====================================================
// CART
// =====================================================

export interface Cart {
  cartId: string;
  items: CartItem[];
  summary: CartSummary;
}

// =====================================================
// COMMON RESPONSE
// =====================================================

export interface CartResponse {
  success: boolean;
  message: string;
  data: Cart;
}

// =====================================================
// ADD TO CART PAYLOAD
// =====================================================

export interface AddCartItemPayload {
  productId: string;
  quantity: number;
}

// =====================================================
// UPDATE CART ITEM PAYLOAD
// =====================================================

export interface UpdateCartItemPayload {
  quantity: number;
}

// =====================================================
// GET CART
// GET /api/v1/cart
// =====================================================

export async function getCart(): Promise<CartResponse> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to view your cart');
  }

  return apiRequest<CartResponse>(
    '/cart',
    {
      method: 'GET',
      token: accessToken,
    },
  );
}

// =====================================================
// ADD ITEM
// POST /api/v1/cart/items
// =====================================================

export async function addToCart(
  productId: string,
  quantity = 1,
): Promise<CartResponse> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to add products to cart');
  }

  return apiRequest<CartResponse>(
    '/cart/items',
    {
      method: 'POST',

      token: accessToken,

      body: {
        productId,
        quantity,
      },
    },
  );
}

// =====================================================
// UPDATE ITEM QUANTITY
// PATCH /api/v1/cart/items/:productId
// =====================================================

export async function updateCartItem(
  productId: string,
  quantity: number,
): Promise<CartResponse> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to update your cart');
  }

  return apiRequest<CartResponse>(
    `/cart/items/${encodeURIComponent(productId)}`,
    {
      method: 'PATCH',

      token: accessToken,

      body: {
        quantity,
      },
    },
  );
}

// =====================================================
// REMOVE ITEM
// DELETE /api/v1/cart/items/:productId
// =====================================================

export async function removeCartItem(
  productId: string,
): Promise<CartResponse> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to remove products from cart');
  }

  return apiRequest<CartResponse>(
    `/cart/items/${encodeURIComponent(productId)}`,
    {
      method: 'DELETE',

      token: accessToken,
    },
  );
}

// =====================================================
// CLEAR CART
// DELETE /api/v1/cart
// =====================================================

export async function clearCart(): Promise<{
  success: boolean;
  message: string;
  data: {
    message: string;
  };
}> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to clear your cart');
  }

  return apiRequest<{
    success: boolean;
    message: string;
    data: {
      message: string;
    };
  }>(
    '/cart',
    {
      method: 'DELETE',

      token: accessToken,
    },
  );
}