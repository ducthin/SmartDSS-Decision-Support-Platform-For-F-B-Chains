import type { QrDiscountPreview, Order } from '@/types';
import api from './api';
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
  code: string;
  label: string;
  priceExtra: number;
}

export interface DrinkToppingOptionDTO {
  code: string;
  label: string;
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

export interface PublicPersonalVoucherDTO {
  code: string;
  title: string;
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

export interface PublicOrderLineDTO {
  menuItemId: number;
  quantity: number;
  selectedSizeCode?: string;
  selectedToppingCodes?: string[];
}

export interface PublicOnlineOrderDTO {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  voucherCode?: string;
  note?: string;
  orderItems: PublicOrderLineDTO[];
}

// ─── Generic fetcher ────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const res = await api.get<{ success: boolean; data: T; message?: string }>(path, {
    baseURL: BASE_URL,
  });
  return (res.data?.data ?? (res.data as unknown as T)) as T;
}

async function apiPost<T, P>(path: string, payload: P): Promise<T> {
  const res = await api.post<{ success: boolean; data: T; message?: string }>(path, payload, {
    baseURL: BASE_URL,
  });
  return (res.data?.data ?? (res.data as unknown as T)) as T;
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

/** GET /api/v1/public/home/orders/discount-preview — public order discount preview */
export const previewPublicOrderDiscount = (params: { subtotal: number; voucherCode?: string; customerPhone?: string }) => {
  const query = new URLSearchParams();
  query.set('subtotal', String(params.subtotal));
  if (params.voucherCode?.trim()) query.set('voucherCode', params.voucherCode.trim());
  if (params.customerPhone?.trim()) query.set('customerPhone', params.customerPhone.trim());
  return apiFetch<QrDiscountPreview>(`/api/v1/public/home/orders/discount-preview?${query.toString()}`);
};

/** POST /api/v1/public/home/orders — place online order */
export const submitPublicOnlineOrder = (payload: PublicOnlineOrderDTO) =>
  apiPost<Order, PublicOnlineOrderDTO>('/api/v1/public/home/orders', payload);

/** GET /api/v1/public/home/personal-vouchers?customerPhone=... */
export const fetchPersonalVouchers = (customerPhone: string): Promise<PublicPersonalVoucherDTO[]> => {
  const query = new URLSearchParams();
  query.set('customerPhone', customerPhone);
  return apiFetch<PublicPersonalVoucherDTO[]>(`/api/v1/public/home/personal-vouchers?${query.toString()}`);
};
