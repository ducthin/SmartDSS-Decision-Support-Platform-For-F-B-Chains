import { Quote } from 'lucide-react';
import { testimonials } from '@/assets/coffee/content';
import { useFeedbackStats } from '@/hooks/useHomepageData';
import Container from '@/components/coffee/Container';
import SectionTitle from '@/components/coffee/SectionTitle';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`h-3.5 w-3.5 ${i <= Math.round(rating) ? 'text-amber-400' : 'text-[rgba(107,80,64,0.2)]'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  const { stats } = useFeedbackStats();

  const avgRating = stats ? parseFloat(stats.averageRating.toFixed(1)) : 4.9;
  const totalReviews = stats ? stats.total : 650;
  return (
    <section
      id="testimonials"
      className="scroll-mt-24 py-16 sm:scroll-mt-28 sm:py-24 bg-gradient-to-br from-[#fffdf9] to-[#f5e9d9]"
    >
      <Container>
        <SectionTitle
          align="center"
          eyebrow="Khách hàng nói gì"
          title="Được yêu mến bởi cộng đồng yêu cà phê"
          subtitle="Một vài chia sẻ từ khách quen và những người luôn tìm kiếm khoảnh khắc bình yên."
        />

        {/* Summary bar */}
        <div className="mx-auto mt-10 max-w-xl rounded-[var(--coffee-radius-lg)] border border-[rgba(107,80,64,0.12)] bg-white/80 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-center">
              <p className="text-4xl font-bold text-[var(--coffee-primary)]">{avgRating.toFixed(1)}</p>
              <StarRating rating={avgRating} />
              <p className="mt-1 text-xs text-[rgba(26,14,7,0.55)]">Trung bình</p>
            </div>
            <div className="flex-1 space-y-1.5 min-w-[150px]">
              {[5, 4, 3].map((star) => {
                const pct = star === 5 ? 85 : star === 4 ? 12 : 3;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="w-3 text-right text-xs text-[rgba(26,14,7,0.55)]">{star}</span>
                    <svg className="h-3 w-3 shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <div className="flex-1 h-1.5 rounded-full bg-[rgba(107,80,64,0.1)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--coffee-accent)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-xs text-[rgba(26,14,7,0.55)]">{pct}%</span>
                  </div>
                );
              })}
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--coffee-dark)]">{totalReviews.toLocaleString('vi-VN')}+</p>
              <p className="text-xs text-[rgba(26,14,7,0.55)]">Lượt đánh giá</p>
            </div>
          </div>
        </div>

        {/* Cards grid */}
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="group coffee-soft-shadow relative flex flex-col gap-4 rounded-[var(--coffee-radius-lg)] border border-[rgba(107,80,64,0.1)] bg-white/95 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(107,80,64,0.22)] hover:shadow-[rgba(26,14,7,0.14)_0px_20px_40px_-8px]"
            >
              {/* Quote icon */}
              <div className="absolute right-4 top-4 text-[var(--coffee-secondary)] opacity-60">
                <Quote className="h-8 w-8" fill="currentColor" />
              </div>

              {/* Stars */}
              <StarRating rating={testimonial.rating} />

              {/* Quote */}
              <p className="flex-1 text-sm leading-relaxed text-[rgba(26,14,7,0.82)] italic">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 border-t border-[rgba(107,80,64,0.08)] pt-3">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  loading="lazy"
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-[rgba(201,162,122,0.3)]"
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--coffee-dark)]">{testimonial.name}</p>
                  <p className="text-xs text-[rgba(26,14,7,0.55)]">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
