import type { ElementType, ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface ContainerProps {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

export default function Container({ as: Tag = 'div', className, children }: ContainerProps) {
  return <Tag className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</Tag>;
}
