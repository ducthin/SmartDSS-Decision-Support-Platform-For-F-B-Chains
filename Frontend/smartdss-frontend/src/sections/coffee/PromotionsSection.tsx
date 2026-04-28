import { useEffect, useMemo, useState } from 'react';
import { Tag, CalendarClock, Gift, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { promotions } from '@/assets/coffee/content';
import { fetchHomepagePromotions, type PublicPromotionDTO } from '@/services/homepageApi';
import { qrService } from '@/services/qrService';
import Container from '@/components/coffee/Container';
import SectionTitle from '@/components/coffee/SectionTitle';


export default function PromotionsSection() {
  const [realPromotions, setRealPromotions] = useState<PublicPromotionDTO[]>([]);
  const [telegramPhone, setTelegramPhone] = useState('');
  const [creatingTelegramLink, setCreatingTelegramLink] = useState(false);
  const CUSTOMER_PHONE_REGEX = /^[+0-9][0-9]{8,19}$/;

  useEffect(() => {
    let cancelled = false;
    fetchHomepagePromotions()
      .then((data) => {
        if (!cancelled) setRealPromotions(data || []);
      })
      .catch(() => {
        if (!cancelled) setRealPromotions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayPromotions = useMemo(() => {
    if (realPromotions.length === 0) {
      return promotions.map((p) => ({
        id: p.id,
        badge: p.badge,
        title: p.title,
        description: p.description,
        discountLabel: undefined,
        validUntil: p.validUntil,
        bgColor: p.bgColor,
        iconText: p.icon,
      }));
    }
    return realPromotions.map((p) => ({
      id: p.id,
      badge: p.badge || 'Ưu đãi',
      title: p.title,
      description: p.description || 'Ưu đãi hiện đang áp dụng tại quán.',
      discountLabel: p.discountLabel,
      validUntil: p.validUntil,
      bgColor:
        p.sourceType === 'EVENT'
          ? 'rgba(99,102,241,0.35)'
          : p.sourceType === 'HOLIDAY'
            ? 'rgba(236,72,153,0.35)'
            : 'rgba(201,162,122,0.35)',
      iconText: p.sourceType === 'EVENT' ? '' : p.sourceType === 'HOLIDAY' ? '' : '',
    }));
  }, [realPromotions]);

  const openTelegramOptIn = async () => {
    const phone = telegramPhone.replace(/\s+/g, '').trim();
    if (!CUSTOMER_PHONE_REGEX.test(phone)) {
      toast.error('Vui lòng nhập số điện thoại hợp lệ để nhận ưu đãi');
      return;
    }
    setCreatingTelegramLink(true);
    try {
      const res = await qrService.getTelegramOptInLink(phone);
      const url = res.data.data;
      if (!url) {
        toast.error('Quán chưa cấu hình Telegram bot');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Mở Telegram thành công, vui lòng bấm Start để nhận ưu đãi');
    } catch {
      toast.error('Không tạo được liên kết Telegram');
    } finally {
      setCreatingTelegramLink(false);
    }
  };

  return (
    <section
      id="promotions"
      className="scroll-mt-24 py-16 sm:scroll-mt-28 sm:py-24 bg-gradient-to-br from-[var(--coffee-surface-base)] via-[#1a0e07] to-[#0d0705]"
    >
      <Container>
        <SectionTitle
          align="center"
          eyebrow="Ưu đãi & Khuyến mãi"
          title="Những deal không thể bỏ lỡ"
          subtitle="Từ combo buổi sáng đến đặt bàn nhóm — luôn có điều bất ngờ chờ bạn mỗi lần ghé."
          dark
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {displayPromotions.map((promo, index) => (
            <div
              key={promo.id}
              className="group relative overflow-hidden rounded-[var(--coffee-radius-lg)] border border-[rgba(243,228,208,0.12)] bg-[rgba(243,228,208,0.06)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(201,162,122,0.4)] hover:bg-[rgba(243,228,208,0.1)] cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background gradient */}
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `radial-gradient(circle at 30% 30%, ${promo.bgColor}, transparent 70%)` }}
              />

              {/* Badge */}
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[rgba(201,162,122,0.35)] bg-[rgba(201,162,122,0.15)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--coffee-accent)]">
                <span>{promo.iconText}</span>
                {promo.badge}
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-[var(--coffee-text-secondary)]">
                {promo.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[rgba(243,228,208,0.78)]">
                {promo.description}
              </p>
              {promo.discountLabel && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[rgba(201,162,122,0.16)] px-2.5 py-1 text-xs font-semibold text-[var(--coffee-accent)]">
                  <Tag className="h-3.5 w-3.5" />
                  {promo.discountLabel}
                </p>
              )}

              {promo.validUntil && (
                <p className="mt-4 flex items-center gap-1.5 text-xs text-[rgba(243,228,208,0.5)]">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Hiệu lực đến {promo.validUntil}
                </p>
              )}

              {/* Decorative corner */}
              <div className="absolute -right-6 -top-6 text-6xl opacity-10 transition-opacity group-hover:opacity-20">
                {promo.iconText}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 rounded-[var(--coffee-radius-lg)] border border-[rgba(243,228,208,0.15)] bg-[rgba(243,228,208,0.07)] p-6">
          <div className="mx-auto mt-4 grid max-w-xl gap-2 sm:grid-cols-[1fr_auto]">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={telegramPhone}
              onChange={(e) => setTelegramPhone(e.target.value)}
              placeholder="Nhập SĐT để nhận ưu đãi qua Telegram"
              className="w-full rounded-[var(--coffee-radius-sm)] border border-[rgba(243,228,208,0.26)] bg-[rgba(13,7,5,0.45)] px-3 py-2.5 text-sm text-white placeholder:text-[rgba(243,228,208,0.5)] outline-none focus:border-[var(--coffee-accent)]"
            />
            <button
              type="button"
              onClick={openTelegramOptIn}
              disabled={creatingTelegramLink}
              className="coffee-interactive inline-flex items-center justify-center gap-2 rounded-[var(--coffee-radius-sm)] bg-[#229ED9] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              {creatingTelegramLink ? (
                <>
                  <Gift className="h-4 w-4" />
                  Đang tạo link...
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" />
                  Liên kết Telegram
                </>
              )}
            </button>
          </div>
        </div>
      </Container>
    </section>
  );
}
