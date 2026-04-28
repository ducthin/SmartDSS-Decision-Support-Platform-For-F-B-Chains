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

export interface PublicPromotionDTO {
  id: string;
  sourceType: 'EVENT' | 'HOLIDAY' | 'VOUCHER' | string;
  badge: string;
  title: string;
  description?: string;
  discountLabel?: string;
  validUntil?: string;
}

export interface PublicTableBookingRequestDTO {
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  bookingTime: string;
  guestCount: number;
  note?: string;
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

async function apiPost<T, P>(path: string, payload: P): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || `API error ${res.status} on ${path}`);
  }
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

/** GET /api/v1/public/home/promotions — real promotions for homepage */
export const fetchHomepagePromotions = (): Promise<PublicPromotionDTO[]> =>
  apiFetch<PublicPromotionDTO[]>('/api/v1/public/home/promotions');

/** POST /api/v1/public/home/bookings — public booking request */
export const submitTableBooking = (payload: PublicTableBookingRequestDTO) =>
  apiPost('/api/v1/public/home/bookings', payload);
