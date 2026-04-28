import { useEffect } from 'react';
import CoffeeShopPage from '@/pages/CoffeeShopPage';
import { useStoreLocation } from '@/hooks/useHomepageData';

const DEFAULT_LOCATION = 'TP.HCM';

export default function HomePage() {
  const { location } = useStoreLocation();
  const locationText = location?.address?.trim() || DEFAULT_LOCATION;

  useEffect(() => {
    const homeTitle = `Bean & Brew — Đồ uống craft · Bánh tươi · ${locationText}`;
    const homeDescription =
      `Đồ uống craft, bánh lò và món nhẹ tại ${locationText} — không gian ấm, thực đơn đổi theo mùa. Mang đi, đặt nhóm và tiệc nhỏ.`;
    const previousTitle = document.title;
    document.title = homeTitle;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const addedMeta = !meta;
    const previousDesc = meta?.getAttribute('content') ?? '';

    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', homeDescription);

    return () => {
      document.title = previousTitle;
      if (addedMeta && meta.parentNode) {
        meta.parentNode.removeChild(meta);
      } else {
        meta?.setAttribute('content', previousDesc);
      }
    };
  }, [locationText]);

  return <CoffeeShopPage />;
}
