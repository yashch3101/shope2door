import { apiRequest } from './api';

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number | string;
  mrp: number | string;
  stock: number;
  unit?: string | null;
  weight?: string | null;
  brand?: string | null;
  sku?: string | null;
  images: string[];
  isActive?: boolean;
  isFeatured: boolean;
  category?: ProductCategory | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ProductsResponse {
  success: boolean;
  message: string;
  data: {
    products: Product[];
    pagination: ProductPagination;
  };
}

export async function getProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}): Promise<ProductsResponse> {
  const query = new URLSearchParams();

  if (params?.page !== undefined) {
    query.append('page', String(params.page));
  }

  if (params?.limit !== undefined) {
    query.append('limit', String(params.limit));
  }

  if (params?.search?.trim()) {
    query.append('search', params.search.trim());
  }

  if (params?.categoryId) {
    query.append('categoryId', params.categoryId);
  }

  const queryString = query.toString();

  return apiRequest<ProductsResponse>(
    `/products${queryString ? `?${queryString}` : ''}`,
    {
      method: 'GET',
    },
  );
}

export async function getProductById(
  productId: string,
) {
  return apiRequest<{
    success: boolean;
    message: string;
    data: Product;
  }>(
    `/products/${encodeURIComponent(productId)}`,
    {
      method: 'GET',
    },
  );
}

export async function getSimilarProducts(
  productId: string,
  limit = 10,
) {
  return apiRequest<{
    success: boolean;
    message: string;
    data: Product[];
  }>(
    `/products/similar/${encodeURIComponent(productId)}?limit=${limit}`,
    {
      method: 'GET',
    },
  );
}