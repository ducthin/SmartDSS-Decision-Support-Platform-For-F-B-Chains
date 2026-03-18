import type { AxiosError } from 'axios';
import { ROLE_LABELS } from './constants';

export function formatRoleName(roleName: string | undefined): string {
  const role = roleName?.replace('ROLE_', '') ?? '';
  return ROLE_LABELS[role] ?? role;
}

export function getRoleKey(roleName: string | undefined): string {
  return roleName?.replace('ROLE_', '') ?? '';
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
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
