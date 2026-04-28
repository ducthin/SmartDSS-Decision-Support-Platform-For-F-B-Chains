/**
 * Homepage public API client
 * Base URL: http://localhost:8080
 * All endpoints here are public (no JWT required)
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

// ─── Types (mirroring backend DTOs) ────────────────────────────────────────

export interface CategoryDTO {
  id: number;
  name: string;
  description?: string;
}

export interface DrinkSizeOptionDTO {
  sizeCode: string;
  label: string;
  extraPrice: number;
}

export interface DrinkToppingOptionDTO {
  toppingId: number;
  name: string;
  price: number;
}

export interface MenuItemDTO {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  available: boolean;
  categoryId: number;
  categoryName: string;
  drink: boolean;
  badgeNew?: boolean;
  badgeBestSeller?: boolean;
  drinkSizes?: DrinkSizeOptionDTO[];
  drinkToppings?: DrinkToppingOptionDTO[];
}

export interface FeedbackStatsDTO {
  total: number;
  newCount: number;
  inReviewCount: number;
  resolvedCount: number;
  lowRatingCount: number;
  todayCount: number;
  averageRating: number;
}

export interface StoreLocationDTO {
  latitude?: number;
  longitude?: number;
  address?: string;
}

/** Mirrors BestProductDTO from ReportService */
export interface BestProductDTO {
  menuItemId: number;
  menuItemName: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

// ─── Generic fetcher ────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${path}`);
  }
  const json = await res.json();
  // Backend wraps response: { success: true, data: T }
  return (json?.data ?? json) as T;
}

// ─── Homepage API functions ─────────────────────────────────────────────────

/** GET /api/v1/categories/all — all categories for menu tabs */
export const fetchCategories = (): Promise<CategoryDTO[]> =>
  apiFetch<CategoryDTO[]>('/api/v1/categories/all');

/** GET /api/v1/menu/all — all available menu items */
export const fetchMenuItems = (): Promise<MenuItemDTO[]> =>
  apiFetch<MenuItemDTO[]>('/api/v1/menu/all');

/** GET /api/v1/feedbacks/stats — aggregate feedback stats */
export const fetchFeedbackStats = (): Promise<FeedbackStatsDTO> =>
  apiFetch<FeedbackStatsDTO>('/api/v1/feedbacks/stats');

/** GET /api/v1/settings/store-location — store address & coordinates */
export const fetchStoreLocation = (): Promise<StoreLocationDTO> =>
  apiFetch<StoreLocationDTO>('/api/v1/settings/store-location');

/** GET /api/v1/reports/best-products — top selling items by quantity */
export const fetchBestProducts = (): Promise<BestProductDTO[]> =>
  apiFetch<BestProductDTO[]>('/api/v1/reports/best-products');
