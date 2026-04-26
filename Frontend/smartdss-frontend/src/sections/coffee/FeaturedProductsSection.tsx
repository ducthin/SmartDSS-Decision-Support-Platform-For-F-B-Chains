import { featuredProducts } from '@/assets/coffee/content';
import Container from '@/components/coffee/Container';
import ProductCard from '@/components/coffee/ProductCard';
import SectionTitle from '@/components/coffee/SectionTitle';

export default function FeaturedProductsSection() {
  return (
    <section id="featured" className="py-16 sm:py-20">
      <Container>
        <SectionTitle
          align="center"
          eyebrow="Featured Products"
          title="Handpicked Favorites for Coffee Lovers"
          subtitle="Our signature drinks are crafted for depth, balance, and visual elegance."
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Container>
    </section>
  );
}
