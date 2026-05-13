import { Bell, ClipboardList, Coffee, FileText, Gift, MapPin, MessageSquareText } from 'lucide-react';
import type { QrTab } from '@/components/qr-order/types';

const PAGE_TABS = [
  { id: 'menu' as const, label: 'Thực đơn', Icon: Coffee },
  { id: 'orders' as const, label: 'Đơn của tôi', Icon: ClipboardList },
  { id: 'invoice' as const, label: 'Xuất hóa đơn', Icon: FileText },
  { id: 'telegram' as const, label: 'Nhận ưu đãi', Icon: Gift },
  { id: 'feedback' as const, label: 'Góp ý', Icon: MessageSquareText },
];

interface QrPageHeaderProps {
  tableName: string;
  tab: QrTab;
  onTabChange: (tab: QrTab) => void;
  onCallStaff: () => void;
  callingStaff: boolean;
}

export default function QrPageHeader({ tableName, tab, onTabChange, onCallStaff, callingStaff }: QrPageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(245,230,211,0.35)] bg-[linear-gradient(130deg,var(--coffee-dark)_0%,var(--coffee-primary)_58%,#8d6348_100%)] text-(--coffee-secondary) shadow-[0_14px_34px_-24px_rgba(62,42,31,0.85)]">
      <div className="mx-auto max-w-3xl px-4 pb-4 pt-3 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(245,230,211,0.72)]">Đặt món tại bàn</p>
            <h1 className="mt-1 text-2xl font-semibold leading-none tracking-tight">SmartDSS</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-[rgba(245,230,211,0.94)]">
              <span className="inline-flex h-7 items-center gap-1 rounded-full border border-[rgba(245,230,211,0.24)] bg-[rgba(245,230,211,0.12)] px-2.5 text-xs font-semibold">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {tableName}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onCallStaff}
            disabled={callingStaff}
            className="coffee-interactive mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(245,230,211,0.28)] bg-[rgba(245,230,211,0.18)] disabled:opacity-50"
            title="Gọi nhân viên"
          >
            <Bell className="h-5 w-5" />
          </button>
        </div>

        <nav className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-hide">
          {PAGE_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`coffee-interactive flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${tab === id
                  ? 'bg-(--coffee-secondary) text-(--coffee-primary) shadow-sm'
                  : 'bg-[rgba(245,230,211,0.16)] text-(--coffee-secondary) hover:bg-[rgba(245,230,211,0.24)]'
                }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
