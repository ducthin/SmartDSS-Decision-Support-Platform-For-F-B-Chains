import { ShoppingCart } from 'lucide-react';

interface QrFloatingCartButtonProps {
  cartCount: number;
  grossAmount: number;
  formatPrice: (amount: number) => string;
  onOpenCart: () => void;
}

export default function QrFloatingCartButton({ cartCount, grossAmount, formatPrice, onOpenCart }: QrFloatingCartButtonProps) {
  return (
    <button
      type="button"
      onClick={onOpenCart}
      className="coffee-interactive fixed bottom-5 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-[rgba(245,230,211,0.26)] bg-[linear-gradient(120deg,var(--coffee-primary),var(--coffee-dark))] py-3 pl-5 pr-5 text-(--coffee-secondary) shadow-xl shadow-[rgba(62,42,31,0.36)]"
    >
      <div className="relative">
        <ShoppingCart className="h-5 w-5" />
        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-(--coffee-secondary) px-1 text-[11px] font-bold text-(--coffee-primary) ring-2 ring-(--coffee-primary)">
          {cartCount}
        </span>
      </div>
      <span className="font-bold tabular-nums">{formatPrice(grossAmount)}</span>
      <span className="text-[rgba(245,230,211,0.75)]">·</span>
      <span className="text-sm font-semibold">Giỏ hàng</span>
    </button>
  );
}
