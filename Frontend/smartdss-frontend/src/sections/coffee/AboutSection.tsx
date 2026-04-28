import { CheckCircle } from 'lucide-react';
import { aboutHighlights, aboutImage, brandName } from '@/assets/coffee/content';
import { useStoreLocation } from '@/hooks/useHomepageData';
import Badge from '@/components/coffee/Badge';
import Container from '@/components/coffee/Container';
import ImageWrapper from '@/components/coffee/ImageWrapper';
import SectionTitle from '@/components/coffee/SectionTitle';

export default function AboutSection() {
  const { location } = useStoreLocation();
  const storeAddress = location?.address?.trim() || 'TP.HCM';
  return (
    <section
      id="about"
      className="scroll-mt-24 py-16 sm:scroll-mt-28 sm:py-24 bg-gradient-to-br from-[#fdf7f0] to-[#f5e9d9]"
    >
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        {/* Text */}
        <div className="order-2 space-y-6 lg:order-1">
          <SectionTitle
            eyebrow={`Chúng tôi là ${brandName}`}
            title="Một quầy bar, một bếp nhỏ — cùng một cách làm chỉn chu"
            subtitle="Không chỉ cà phê: chúng tôi chọn hạt rang, trà, bơ sữa và rau củ theo mùa để mỗi suất đều rõ vị và dễ dùng hằng ngày."
          />

          <ul className="space-y-3">
            {aboutHighlights.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-[var(--coffee-radius-md)] border border-[rgba(107,80,64,0.1)] bg-white/80 px-4 py-3.5 text-sm leading-relaxed text-[rgba(26,14,7,0.84)] shadow-sm backdrop-blur-sm"
              >
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--coffee-accent)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { value: '2013', label: 'Năm thành lập' },
              { value: '12+', label: 'Năm kinh nghiệm' },
              { value: '8K+', label: 'Khách/tháng' },
            ].map((s) => (
              <div
                key={s.label}
                className="coffee-soft-shadow rounded-[var(--coffee-radius-sm)] border border-[rgba(107,80,64,0.1)] bg-white/95 p-3 text-center"
              >
                <p className="text-xl font-bold text-[var(--coffee-primary)]">{s.value}</p>
                <p className="text-[11px] text-[rgba(26,14,7,0.65)]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Image */}
        <div className="order-1 lg:order-2 relative">
          {/* Decorative frame */}
          <div className="absolute -right-4 -top-4 h-full w-full rounded-[var(--coffee-radius-lg)] border-2 border-[rgba(201,162,122,0.3)] bg-transparent" />
          <ImageWrapper
            src={aboutImage}
            alt="Không gian quán với quầy pha chế và chỗ ngồi ấm"
            ratio="hero"
            className="coffee-soft-shadow-lg relative z-10 rounded-[var(--coffee-radius-lg)]"
          />
          <Badge variant="dark" className="-mt-5 ml-5 relative z-20 shadow-lg">
            Mở cửa phục vụ tại {storeAddress} từ 2013
          </Badge>

          {/* Floating card */}
          <div className="coffee-soft-shadow absolute -left-6 top-8 z-20 rounded-[var(--coffee-radius-md)] border border-[rgba(107,80,64,0.12)] bg-white/95 px-4 py-3 backdrop-blur-sm hidden sm:block">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(26,14,7,0.5)]">Đánh giá trung bình</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-bold text-[var(--coffee-primary)]">4.9</span>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-[rgba(26,14,7,0.55)]">Từ 650+ đánh giá</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
