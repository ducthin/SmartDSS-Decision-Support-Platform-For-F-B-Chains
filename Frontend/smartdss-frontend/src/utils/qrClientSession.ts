/**
 * Mỗi trình duyệt/thiết bị quét QR có một mã phiên cố định (theo token bàn),
 * để backend chỉ trả về đơn do chính thiết bị đó đặt.
 */
import type { Order } from '@/types';

const STORAGE_PREFIX = 'smartdss_qr_session_';

/** Đọc mã phiên từ DTO (camelCase hoặc snake_case nếu proxy đổi tên). */
export function getOrderQrSessionId(o: Order & { qr_client_session_id?: string }): string | undefined {
  const raw = o.qrClientSessionId ?? o.qr_client_session_id;
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

export function getOrCreateQrClientSessionId(qrToken: string): string {
  const key = `${STORAGE_PREFIX}${qrToken}`;
  try {
    const existing = localStorage.getItem(key);
    if (existing && /^[a-zA-Z0-9-]{8,64}$/.test(existing)) {
      return existing;
    }
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return `fb${Date.now()}${Math.random().toString(36).slice(2, 12)}`;
  }
}
