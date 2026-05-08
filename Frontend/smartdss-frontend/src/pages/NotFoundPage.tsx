import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import '@/styles/coffee-theme.css';

export default function NotFoundPage() {
  useEffect(() => {
    const prev = document.title;
    document.title = '404 — Trang không tồn tại | Bean & Brew';
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="coffee-theme min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-[#fffdf9] px-4 text-center">
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed -left-40 top-1/4 h-[480px] w-[480px] rounded-full bg-[rgba(201,162,122,0.10)] blur-3xl" />
      <div className="pointer-events-none fixed -right-40 bottom-1/4 h-[400px] w-[400px] rounded-full bg-[rgba(107,80,64,0.08)] blur-3xl" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[rgba(201,162,122,0.06)] blur-3xl" />

      {/* Decorative grid */}
      <div className="coffee-grid-pattern pointer-events-none absolute inset-0 opacity-40" />

      {/* Content card */}
      <div className="relative z-10 flex flex-col items-center gap-6 animate-fade-in-up">

        {/* Coffee cup illustration */}
        <div className="relative flex items-center justify-center">
          {/* Ripple rings */}
          <span className="animate-ripple absolute h-36 w-36 rounded-full bg-[rgba(201,162,122,0.22)]" />
          <span className="animate-ripple absolute h-36 w-36 rounded-full bg-[rgba(201,162,122,0.14)]" style={{ animationDelay: '0.6s' }} />
          {/* Icon circle */}
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[linear-gradient(135deg,#c9a27a,#6b5040)] shadow-[0_20px_60px_-16px_rgba(107,80,64,0.55)]">
            <span className="animate-bounce-steam text-5xl select-none">☕</span>
          </div>
        </div>

        {/* 404 number */}
        <div className="relative">
          <span
            className="select-none text-[clamp(5rem,20vw,9rem)] font-black leading-none tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #c9a27a 0%, #6b5040 50%, #1a0e07 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            404
          </span>
          {/* Steam lines above the 404 */}
          <div className="absolute -top-6 left-1/2 flex -translate-x-1/2 gap-3 opacity-60">
            {[0, 0.2, 0.4].map((delay, i) => (
              <div
                key={i}
                className="animate-bounce-steam h-5 w-0.5 rounded-full bg-[var(--coffee-accent)]"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--coffee-dark)] sm:text-3xl">
            Ồ! Trang này đã bay đâu mất rồi
          </h1>
          <p className="max-w-sm text-[rgba(26,14,7,0.6)] leading-relaxed">
            Có vẻ như bạn đang tìm một trang không tồn tại.
            Hãy để chúng tôi pha cho bạn một ly cà phê và dẫn bạn về đúng chỗ nhé.
          </p>
        </div>

        {/* Divider with coffee beans */}
        <div className="flex items-center gap-3 text-[rgba(107,80,64,0.4)]">
          <div className="h-px w-16 bg-[rgba(107,80,64,0.18)]" />
          <span className="text-lg">✦</span>
          <div className="h-px w-16 bg-[rgba(107,80,64,0.18)]" />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/"
            id="not-found-home-btn"
            className="coffee-interactive inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--coffee-primary),var(--coffee-dark))] px-7 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_-8px_rgba(107,80,64,0.5)] transition hover:brightness-110 active:scale-95"
          >
            🏠 Về trang chủ
          </Link>
          <Link
            to="/menu"
            id="not-found-menu-btn"
            className="coffee-interactive inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(107,80,64,0.22)] bg-white px-7 py-3 text-sm font-semibold text-[var(--coffee-primary)] shadow-sm transition hover:bg-[rgba(107,80,64,0.05)] hover:border-[rgba(107,80,64,0.4)] active:scale-95"
          >
            ☕ Xem thực đơn
          </Link>
        </div>

        {/* Footer hint */}
        <p className="text-xs text-[rgba(26,14,7,0.38)]">
          Lỗi 404 · Bean &amp; Brew
        </p>
      </div>
    </div>
  );
}

