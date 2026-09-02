import { apiRequest } from './api';
import { getAccessToken } from './auth.storage';

// =====================================================
// ADDRESS
// =====================================================

export type AddressType =
  | 'HOME'
  | 'WORK'
  | 'OTHER';

export interface Address {
  id: string;
  userId: string;
  type: AddressType;

  name: string;
  phone: string;

  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;

  city: string;
  state: string;
  pincode: string;

  latitude?: number | null;
  longitude?: number | null;

  isDefault: boolean;

  createdAt: string;
  updatedAt: string;
}

// =====================================================
// RESPONSE TYPES
// =====================================================

export interface AddressesResponse {
  success: boolean;
  message: string;
  data: {
    addresses: Address[];
    count: number;
  };
}

export interface AddressResponse {
  success: boolean;
  message: string;
  data: Address;
}

// =====================================================
// CREATE ADDRESS
// POST /api/v1/addresses
// =====================================================

export interface CreateAddressPayload {
  type?: AddressType;

  name: string;
  phone: string;

  addressLine1: string;
  addressLine2?: string;
  landmark?: string;

  city: string;
  state: string;
  pincode: string;

  latitude?: number;
  longitude?: number;

  isDefault?: boolean;
}

export async function createAddress(
  payload: CreateAddressPayload,
): Promise<AddressResponse> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to create an address');
  }

  return apiRequest<AddressResponse>(
    '/addresses',
    {
      method: 'POST',
      token: accessToken,
      body: payload,
    },
  );
}

// =====================================================
// GET ALL ADDRESSES
// GET /api/v1/addresses
// =====================================================

export async function getAddresses(): Promise<AddressesResponse> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to view your addresses');
  }

  return apiRequest<AddressesResponse>(
    '/addresses',
    {
      method: 'GET',
      token: accessToken,
    },
  );
}

// =====================================================
// GET SINGLE ADDRESS
// GET /api/v1/addresses/:id
// =====================================================

export async function getAddress(
  addressId: string,
): Promise<AddressResponse> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to view this address');
  }

  return apiRequest<AddressResponse>(
    `/addresses/${encodeURIComponent(addressId)}`,
    {
      method: 'GET',
      token: accessToken,
    },
  );
}

// =====================================================
// UPDATE ADDRESS
// PATCH /api/v1/addresses/:id
// =====================================================

export interface UpdateAddressPayload {
  type?: AddressType;

  name?: string;
  phone?: string;

  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;

  city?: string;
  state?: string;
  pincode?: string;

  latitude?: number;
  longitude?: number;

  isDefault?: boolean;
}

export async function updateAddress(
  addressId: string,
  payload: UpdateAddressPayload,
): Promise<AddressResponse> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to update your address');
  }

  return apiRequest<AddressResponse>(
    `/addresses/${encodeURIComponent(addressId)}`,
    {
      method: 'PATCH',
      token: accessToken,
      body: payload,
    },
  );
}

// =====================================================
// SET DEFAULT ADDRESS
// PATCH /api/v1/addresses/:id/default
// =====================================================

export async function setDefaultAddress(
  addressId: string,
): Promise<{
  success: boolean;
  message: string;
  data: {
    addressId: string;
    isDefault: boolean;
  };
}> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to change your default address');
  }

  return apiRequest<{
    success: boolean;
    message: string;
    data: {
      addressId: string;
      isDefault: boolean;
    };
  }>(
    `/addresses/${encodeURIComponent(addressId)}/default`,
    {
      method: 'PATCH',
      token: accessToken,
    },
  );
}

// =====================================================
// DELETE ADDRESS
// DELETE /api/v1/addresses/:id
// =====================================================

export async function deleteAddress(
  addressId: string,
): Promise<{
  success: boolean;
  message: string;
  data: {
    addressId: string;
    deleted: boolean;
  };
}> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Please login to delete your address');
  }

  return apiRequest<{
    success: boolean;
    message: string;
    data: {
      addressId: string;
      deleted: boolean;
    };
  }>(
    `/addresses/${encodeURIComponent(addressId)}`,
    {
      method: 'DELETE',
      token: accessToken,
    },
  );
}