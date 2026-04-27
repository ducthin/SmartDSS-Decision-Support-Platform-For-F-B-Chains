import type { MenuItem } from '@/types';

export type QrTab = 'menu' | 'orders' | 'invoice' | 'telegram' | 'feedback';

export interface CartItem {
  key: string;
  menuItem: MenuItem;
  quantity: number;
  selectedSizeCode?: string;
  selectedToppingCodes?: string[];
}
