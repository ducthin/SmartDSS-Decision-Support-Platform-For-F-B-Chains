import { useEffect } from 'react';
import CoffeeShopPage from '@/pages/CoffeeShopPage';

const HOME_TITLE = 'Bean & Brew — Đồ uống craft · Bánh tươi · TP Đà Nẵng';
const HOME_DESCRIPTION =
  'Đồ uống craft, bánh lò và món nhẹ tại TP Đà Nẵng — không gian ấm, thực đơn đổi theo mùa. Mang đi, đặt nhóm và tiệc nhỏ.';

export default function HomePage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = HOME_TITLE;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const addedMeta = !meta;
    const previousDesc = meta?.getAttribute('content') ?? '';

    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', HOME_DESCRIPTION);

    return () => {
      document.title = previousTitle;
      if (addedMeta && meta.parentNode) {
        meta.parentNode.removeChild(meta);
      } else {
        meta?.setAttribute('content', previousDesc);
      }
    };
  }, []);

  return <CoffeeShopPage />;
}
