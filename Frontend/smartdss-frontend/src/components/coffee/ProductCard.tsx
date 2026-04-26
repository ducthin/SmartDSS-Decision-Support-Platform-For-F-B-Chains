import type { FeaturedProduct } from '@/assets/coffee/content';
import Badge from '@/components/coffee/Badge';
import Button from '@/components/coffee/Button';
import Card from '@/components/coffee/Card';
import ImageWrapper from '@/components/coffee/ImageWrapper';
import RatingStars from '@/components/coffee/RatingStars';

interface ProductCardProps {
  product: FeaturedProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Card variant="product" className="flex h-full flex-col gap-4 p-4">
      <div className="relative">
        <ImageWrapper src={product.image} alt={product.name} ratio="portrait" />
        {product.tag && <Badge className="absolute left-3 top-3">{product.tag}</Badge>}
      </div>
      <div className="space-y-3">
        <h3 className="text-xl font-semibold text-[var(--coffee-dark)]">{product.name}</h3>
        <p className="text-sm leading-relaxed text-[rgba(62,42,31,0.78)]">{product.description}</p>
        <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
      </div>
      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="text-sm font-semibold tracking-wide text-[var(--coffee-primary)]">{product.price}</span>
        <Button href="#menu" variant="outline" size="sm">
          Order now
        </Button>
      </div>
    </Card>
  );
}
