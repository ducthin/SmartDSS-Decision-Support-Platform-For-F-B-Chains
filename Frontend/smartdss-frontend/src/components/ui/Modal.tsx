import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

let scrollLockCount = 0;
let previousBodyOverflow = '';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
  overlayClassName?: string;
  panelClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  closeButtonClassName?: string;
  bodyClassName?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  overlayClassName,
  panelClassName,
  headerClassName,
  titleClassName,
  closeButtonClassName,
  bodyClassName,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    if (scrollLockCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    scrollLockCount += 1;
    return () => {
      document.removeEventListener('keydown', onKey);
      scrollLockCount = Math.max(0, scrollLockCount - 1);
      if (scrollLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
        previousBodyOverflow = '';
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn('fixed inset-0 z-200 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-6', overlayClassName)}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          `my-4 flex min-h-0 w-full max-h-[min(90dvh,calc(100vh-2rem))] flex-col rounded-xl bg-white shadow-xl outline-none sm:my-8 ${maxWidth}`,
          panelClassName,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn('flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4', headerClassName)}>
          <h2 id="modal-title" className={cn('pr-2 text-lg font-semibold', titleClassName)}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={cn('shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800', closeButtonClassName)}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>
        <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4', bodyClassName)}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
