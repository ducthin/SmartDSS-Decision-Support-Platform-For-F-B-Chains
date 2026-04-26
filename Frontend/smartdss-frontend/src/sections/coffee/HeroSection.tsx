import { ArrowRight, Sparkles } from 'lucide-react';
import { heroImage, heroStats } from '@/assets/coffee/content';
import Badge from '@/components/coffee/Badge';
import Button from '@/components/coffee/Button';
import Container from '@/components/coffee/Container';
import ImageWrapper from '@/components/coffee/ImageWrapper';

export default function HeroSection() {
  return (
    <section id="home" className="relative overflow-hidden pb-16 pt-14 sm:pb-20 sm:pt-20">
      <Container className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-6 animate-fade-in-up">
          <Badge variant="dark" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Premium Coffee Experience
          </Badge>
          <h1 className="max-w-xl text-4xl font-bold leading-tight text-[var(--coffee-dark)] sm:text-5xl lg:text-6xl">
            Crafted Coffee in a Warm, Minimal Atmosphere
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-[rgba(62,42,31,0.78)] sm:text-base">
            Discover specialty coffee designed for modern taste. From bold espresso to smooth slow bar classics, every
            cup is served with detail, calm, and character.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href="#menu" size="lg" className="gap-2">
              Explore Menu
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="#about" variant="outline" size="lg">
              Our Story
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2 sm:max-w-lg">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="coffee-soft-shadow rounded-xl border border-[rgba(111,78,55,0.12)] bg-white/90 p-3 text-center"
              >
                <p className="text-lg font-semibold text-[var(--coffee-primary)] sm:text-xl">{stat.value}</p>
                <p className="text-xs text-[rgba(62,42,31,0.7)]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative animate-fade-in">
          <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-[rgba(228,172,92,0.28)] blur-2xl" />
          <div className="absolute -bottom-12 -right-6 h-28 w-28 rounded-full bg-[rgba(111,78,55,0.25)] blur-3xl" />
          <ImageWrapper src={heroImage} alt="Premium coffee table setting" ratio="hero" className="coffee-soft-shadow-lg" />
          <div className="coffee-soft-shadow animate-float-soft absolute -bottom-6 left-4 rounded-xl border border-[rgba(111,78,55,0.1)] bg-white/95 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[rgba(62,42,31,0.65)]">Chef Recommendation</p>
            <p className="mt-1 text-sm font-semibold text-[var(--coffee-dark)]">Try the Caramel Cloud Latte</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
