import '@/styles/coffee-theme.css';
import AboutSection from '@/sections/coffee/AboutSection';
import BookingSection from '@/sections/coffee/BookingSection';
import FeaturedProductsSection from '@/sections/coffee/FeaturedProductsSection';
import FooterSection from '@/sections/coffee/FooterSection';
import GallerySection from '@/sections/coffee/GallerySection';
import HeroSection from '@/sections/coffee/HeroSection';
import MenuSection from '@/sections/coffee/MenuSection';
import NavbarSection from '@/sections/coffee/NavbarSection';
import PromotionsSection from '@/sections/coffee/PromotionsSection';
import TestimonialsSection from '@/sections/coffee/TestimonialsSection';

export default function CoffeeShopPage() {
  return (
    /*
     * IMPORTANT: Do NOT add overflow-x-hidden here — it breaks position:sticky on the Navbar.
     * Clip horizontal overflow at the <body> level via CSS instead.
     */
    <div className="coffee-theme min-h-screen text-[var(--coffee-dark)]">
      {/* Ambient decorative blobs — use fixed so they don't affect overflow */}
      <div className="pointer-events-none fixed -left-32 top-1/4 h-96 w-96 rounded-full bg-[rgba(201,162,122,0.08)] blur-3xl" />
      <div className="pointer-events-none fixed -right-32 top-2/3 h-96 w-96 rounded-full bg-[rgba(107,80,64,0.07)] blur-3xl" />

      {/* Navbar must be a direct child — NOT inside overflow or relative containers */}
      <NavbarSection />

      <main>
        {/* 1. Hero — full bleed với ảnh nền */}
        <HeroSection />

        {/* 2. Món nổi bật */}
        <FeaturedProductsSection />

        {/* 3. Câu chuyện thương hiệu */}
        <AboutSection />

        {/* 4. Gallery ảnh */}
        <GallerySection />

        {/* 5. Thực đơn đầy đủ với tab */}
        <MenuSection />

        {/* 6. Ưu đãi & Khuyến mãi */}
        <PromotionsSection />

        {/* 7. Đặt bàn */}
        <BookingSection />

        {/* 8. Đánh giá khách hàng */}
        <TestimonialsSection />
      </main>

      <FooterSection />
    </div>
  );
}
