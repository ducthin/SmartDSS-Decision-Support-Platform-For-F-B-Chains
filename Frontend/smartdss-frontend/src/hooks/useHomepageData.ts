import { useEffect, useState } from 'react';
import {
  fetchBestProducts,
  fetchCategories,
  fetchFeedbackStats,
  fetchMenuItems,
  fetchStoreLocation,
  type BestProductDTO,
  type CategoryDTO,
  type FeedbackStatsDTO,
  type MenuItemDTO,
  type StoreLocationDTO,
} from '@/services/homepageApi';

// ─── useMenuData ────────────────────────────────────────────────────────────

export interface UseMenuDataResult {
  categories: CategoryDTO[];
  menuItems: MenuItemDTO[];
  featuredItems: MenuItemDTO[];
  loading: boolean;
  error: string | null;
}

export function useMenuData(): UseMenuDataResult {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([fetchCategories(), fetchMenuItems()])
      .then(([cats, items]) => {
        if (cancelled) return;
        setCategories(cats);
        // Only show available items
        setMenuItems(items.filter((i) => i.available));
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('[useMenuData]', err);
        setError('Không thể tải thực đơn. Đang hiển thị dữ liệu mẫu.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const featuredItems = menuItems.filter(
    (i) => i.badgeBestSeller || i.badgeNew,
  ).slice(0, 4);

  return { categories, menuItems, featuredItems, loading, error };
}

// ─── useFeedbackStats ───────────────────────────────────────────────────────

export interface UseFeedbackStatsResult {
  stats: FeedbackStatsDTO | null;
  loading: boolean;
  error: string | null;
}

export function useFeedbackStats(): UseFeedbackStatsResult {
  const [stats, setStats] = useState<FeedbackStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFeedbackStats()
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.error('[useFeedbackStats]', err);
          setError('Không thể tải đánh giá.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading, error };
}

// ─── useStoreLocation ───────────────────────────────────────────────────────

export interface UseStoreLocationResult {
  location: StoreLocationDTO | null;
  loading: boolean;
}

export function useStoreLocation(): UseStoreLocationResult {
  const [location, setLocation] = useState<StoreLocationDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchStoreLocation()
      .then((data) => {
        if (!cancelled) setLocation(data);
      })
      .catch((err: unknown) => {
        console.error('[useStoreLocation]', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { location, loading };
}

// ─── useBestProducts ─────────────────────────────────────────────────────────

export interface RankedProduct {
  rank: number;
  menuItemId: number;
  name: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  totalQuantitySold: number;
}

export interface UseBestProductsResult {
  rankedProducts: RankedProduct[];
  loading: boolean;
}

export function useBestProducts(): UseBestProductsResult {
  const [rankedProducts, setRankedProducts] = useState<RankedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Fetch both in parallel: top products + full menu (for price/image)
    Promise.all([fetchBestProducts(), fetchMenuItems()])
      .then(([best, menuItems]: [BestProductDTO[], MenuItemDTO[]]) => {
        if (cancelled) return;

        // Build a lookup map: menuItemId → MenuItemDTO
        const menuMap = new Map<number, MenuItemDTO>();
        menuItems.forEach((m) => menuMap.set(m.id, m));

        // Sort by quantity descending, take top 5, enrich with menu data
        const enriched: RankedProduct[] = best
          .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold)
          .slice(0, 5)
          .map((b, idx) => {
            const menuItem = menuMap.get(b.menuItemId);
            return {
              rank: idx + 1,
              menuItemId: b.menuItemId,
              name: b.menuItemName,
              description: menuItem?.description,
              price: menuItem?.price,
              imageUrl: menuItem?.imageUrl,
              totalQuantitySold: b.totalQuantitySold,
            };
          });

        setRankedProducts(enriched);
      })
      .catch((err: unknown) => {
        console.error('[useBestProducts]', err);
        // Silently fail — FeaturedProductsSection will use static fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { rankedProducts, loading };
}
