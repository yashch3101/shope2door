import { apiRequest } from './api';

export type Banner = {
  id: string;
  image: string;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type BannersResponse = {
  success: boolean;
  message: string;
  data: Banner[];
};

export async function getBanners(): Promise<BannersResponse> {
  return apiRequest<BannersResponse>('/banners', {
    method: 'GET',
  });
}