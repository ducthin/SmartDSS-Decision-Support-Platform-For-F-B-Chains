import '@/styles/coffee-theme.css';
import AboutSection from '@/sections/coffee/AboutSection';
import FeaturedProductsSection from '@/sections/coffee/FeaturedProductsSection';
import FooterSection from '@/sections/coffee/FooterSection';
import HeroSection from '@/sections/coffee/HeroSection';
import MenuSection from '@/sections/coffee/MenuSection';
import NavbarSection from '@/sections/coffee/NavbarSection';
import TestimonialsSection from '@/sections/coffee/TestimonialsSection';

export default function CoffeeShopPage() {
  return (
    <div className="coffee-theme relative overflow-x-hidden bg-[#fffdf9] text-(--coffee-dark)">
      <div className="coffee-grid-pattern pointer-events-none absolute inset-0 opacity-45" />
      <div className="pointer-events-none absolute -left-24 top-32 h-64 w-64 rounded-full bg-[rgba(228,172,92,0.22)] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-112 h-72 w-72 rounded-full bg-[rgba(111,78,55,0.18)] blur-3xl" />

      <div className="relative z-10">
        <NavbarSection />
        <main>
          <HeroSection />
          <FeaturedProductsSection />
          <AboutSection />
          <MenuSection />
          <TestimonialsSection />
        </main>
        <FooterSection />
      </div>
    </div>
  );
}
