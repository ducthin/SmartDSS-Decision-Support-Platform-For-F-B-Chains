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
  return `${new Intl.NumberFormat('vi-VN').format(n)} VND`;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError?.response?.data?.message ?? fallback;
}
