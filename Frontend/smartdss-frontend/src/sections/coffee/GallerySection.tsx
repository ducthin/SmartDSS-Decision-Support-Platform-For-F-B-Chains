import { useState } from 'react';
import { X } from 'lucide-react';
import { galleryImages } from '@/assets/coffee/content';
import Container from '@/components/coffee/Container';
import SectionTitle from '@/components/coffee/SectionTitle';

export default function GallerySection() {
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <section id="gallery" className="scroll-mt-24 py-16 sm:scroll-mt-28 sm:py-24 bg-[#fdf7f0]">
      <Container>
        <SectionTitle
          align="center"
          eyebrow="Không gian & Món ăn"
          title="Một góc nhìn vào Bean & Brew"
          subtitle="Từ quầy pha chế đến từng góc ngồi yêu thích — không gian được chăm chút cho mỗi khoảnh khắc."
        />

        {/* Masonry-style grid */}
        <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4">
          {galleryImages.map((img, index) => (
            <div
              key={img.id}
              className={`group relative cursor-pointer overflow-hidden rounded-[var(--coffee-radius-lg)] ${
                index === 0 ? 'md:row-span-2' : ''
              }`}
              onClick={() => setLightbox(img.src)}
            >
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className={`w-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                  index === 0 ? 'h-[300px] md:h-full' : 'h-[180px] sm:h-[220px]'
                }`}
              />
              {/* Caption overlay */}
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-[rgba(13,7,5,0.7)] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <p className="w-full px-4 py-3 text-sm font-semibold text-white">
                  {img.caption}
                </p>
              </div>
              {/* Zoom icon */}
              <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(13,7,5,0.55)] text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </Container>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-[rgba(13,7,5,0.9)] p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(243,228,208,0.15)] text-white hover:bg-[rgba(243,228,208,0.3)]"
            onClick={() => setLightbox(null)}
            aria-label="Đóng ảnh"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox}
            alt="Gallery"
            className="max-h-[85vh] max-w-[90vw] rounded-[var(--coffee-radius-lg)] object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
