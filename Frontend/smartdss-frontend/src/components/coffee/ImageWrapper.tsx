import { cn } from '@/utils/cn';

type Ratio = 'square' | 'portrait' | 'landscape' | 'hero';

interface ImageWrapperProps {
  src: string;
  alt: string;
  ratio?: Ratio;
  className?: string;
  imageClassName?: string;
}

const ratioStyles: Record<Ratio, string> = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
  hero: 'aspect-[16/11]',
};

export default function ImageWrapper({ src, alt, ratio = 'landscape', className, imageClassName }: ImageWrapperProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[var(--coffee-radius-md)] bg-[var(--coffee-secondary)]',
        ratioStyles[ratio],
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn('h-full w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105', imageClassName)}
      />
    </div>
  );
}
