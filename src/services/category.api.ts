import { apiRequest } from './api';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  icon?: string | null;
  sortOrder: number;
}

export interface CategoriesResponse {
  success: boolean;
  message: string;
  data: Category[];
}

export async function getCategories(): Promise<CategoriesResponse> {
  return apiRequest<CategoriesResponse>(
    '/categories',
    {
      method: 'GET',
    },
  );
}

export async function getCategoryBySlug(
  slug: string,
) {
  return apiRequest<{
    success: boolean;
    message: string;
    data: Category;
  }>(
    `/categories/slug/${encodeURIComponent(slug)}`,
    {
      method: 'GET',
    },
  );
}