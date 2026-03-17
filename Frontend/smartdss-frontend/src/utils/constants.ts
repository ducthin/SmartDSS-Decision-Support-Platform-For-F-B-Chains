export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PREPARING: 'PREPARING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  [ORDER_STATUS.PENDING]: 'Chờ xử lý',
  [ORDER_STATUS.PREPARING]: 'Đang pha',
  [ORDER_STATUS.COMPLETED]: 'Hoàn thành',
  [ORDER_STATUS.CANCELLED]: 'Đã hủy',
};

export const ORDER_STATUS_STYLES: Record<string, string> = {
  [ORDER_STATUS.PENDING]: 'bg-yellow-100 text-yellow-700',
  [ORDER_STATUS.PREPARING]: 'bg-blue-100 text-blue-700',
  [ORDER_STATUS.COMPLETED]: 'bg-green-100 text-green-700',
  [ORDER_STATUS.CANCELLED]: 'bg-red-100 text-red-700',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  BARISTA: 'Staff (Barista)',
  WAITER: 'Staff (Waiter)',
};
