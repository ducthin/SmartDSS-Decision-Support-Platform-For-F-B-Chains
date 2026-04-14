import type { AxiosError } from 'axios';
import type { MenuItem } from '@/types';
import { ROLE_LABELS } from './constants';

function normalizeRole(roleName: string | undefined): string {
  const role = roleName?.replace('ROLE_', '') ?? '';
  if (role === 'WAITER' || role === 'BARISTA') {
    return 'STAFF';
  }
  return role;
}

export function formatRoleName(roleName: string | undefined): string {
  const role = normalizeRole(roleName);
  return ROLE_LABELS[role] ?? role;
}

export function getRoleKey(roleName: string | undefined): string {
  return normalizeRole(roleName);
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

/** Giá kiểu menu quán: 21k, 29k (làm tròn nghìn). */
export function formatMenuCompactPrice(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n >= 1000 && n % 1000 === 0) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(n));
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError?.response?.data?.message ?? fallback;
}

export function calculateVatBreakdown(amount: number, vatRatePercent: number, priceIncludesVat: boolean) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const rate = vatRatePercent / 100;
  if (priceIncludesVat) {
    const netAmount = Math.round(safeAmount / (1 + rate));
    const vatAmount = safeAmount - netAmount;
    return { netAmount, vatAmount, grossAmount: safeAmount };
  }
  const netAmount = safeAmount;
  const vatAmount = Math.round(netAmount * rate);
  const grossAmount = netAmount + vatAmount;
  return { netAmount, vatAmount, grossAmount };
}

/** Unique key for a cart line (same dish + size + topping set). */
export function drinkCartLineKey(menuItemId: number, sizeCode?: string, toppingCodes?: string[]): string {
  const tops = [...(toppingCodes || [])].sort().join(',');
  return `${menuItemId}|${sizeCode ?? ''}|${tops}`;
}

export function unitPriceWithDrinkOptions(item: MenuItem, sizeCode?: string, toppingCodes?: string[]): number {
  if (!item.drink) return item.price;
  const sizes = item.drinkSizes || [];
  const toppings = item.drinkToppings || [];
  const sz = sizes.find((s) => s.code === sizeCode);
  const sizeExtra = sz?.priceExtra ?? 0;
  let topSum = 0;
  for (const code of toppingCodes || []) {
    const t = toppings.find((x) => x.code === code);
    if (t) topSum += t.price;
  }
  return item.price + sizeExtra + topSum;
}

/** Text for one order line (size + toppings). */
export function formatOrderItemExtras(item: {
  selectedSizeLabel?: string;
  selectedToppings?: { label: string }[];
}): string {
  const parts: string[] = [];
  if (item.selectedSizeLabel) parts.push(item.selectedSizeLabel);
  if (item.selectedToppings?.length) {
    parts.push(item.selectedToppings.map((t) => t.label).join(', '));
  }
  return parts.length ? ` (${parts.join(' · ')})` : '';
}
