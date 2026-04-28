import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface SharedProps {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

type LinkButtonProps = SharedProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'> & {
    href: string;
  };

type NativeButtonProps = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    href?: undefined;
  };

type ButtonProps = LinkButtonProps | NativeButtonProps;

const baseStyles =
  'coffee-interactive inline-flex items-center justify-center rounded-[var(--coffee-radius-sm)] font-semibold tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coffee-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--coffee-surface-muted)]';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--coffee-primary)] text-white coffee-soft-shadow hover:-translate-y-0.5 hover:bg-[var(--coffee-dark)]',
  secondary:
    'border border-[rgba(111,78,55,0.18)] bg-[var(--coffee-secondary)] text-[var(--coffee-dark)] hover:bg-[#f1dcc2] hover:-translate-y-0.5',
  outline:
    'border border-[var(--coffee-primary)] bg-transparent text-[var(--coffee-primary)] hover:bg-[rgba(111,78,55,0.08)] hover:-translate-y-0.5',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

function getClasses(variant: ButtonVariant, size: ButtonSize, fullWidth: boolean, className?: string) {
  return cn(baseStyles, variantStyles[variant], sizeStyles[size], fullWidth && 'w-full', className);
}

function isLinkButton(props: ButtonProps): props is LinkButtonProps {
  return typeof props.href === 'string';
}

export default function Button(props: ButtonProps) {
  const variant = props.variant ?? 'primary';
  const size = props.size ?? 'md';
  const fullWidth = props.fullWidth ?? false;

  if (isLinkButton(props)) {
    const { children, className, href, ...anchorProps } = props;
    return (
      <a href={href} className={getClasses(variant, size, fullWidth, className)} {...anchorProps}>
        {children}
      </a>
    );
  }

  const { children, className, type = 'button', ...buttonProps } = props;
  return (
    <button type={type} className={getClasses(variant, size, fullWidth, className)} {...buttonProps}>
      {children}
    </button>
  );
}
