import { aboutHighlights, aboutImage } from '@/assets/coffee/content';
import Badge from '@/components/coffee/Badge';
import Container from '@/components/coffee/Container';
import ImageWrapper from '@/components/coffee/ImageWrapper';
import SectionTitle from '@/components/coffee/SectionTitle';

export default function AboutSection() {
  return (
    <section id="about" className="py-16 sm:py-20">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
        <div className="order-2 space-y-6 lg:order-1">
          <SectionTitle
            eyebrow="About Velvet Roast"
            title="A Premium Coffee House Built Around Craft and Calm"
            subtitle="We combine precision brewing with minimalist design to create a coffee ritual that feels both luxurious and welcoming."
          />
          <ul className="space-y-3">
            {aboutHighlights.map((item) => (
              <li
                key={item}
                className="coffee-soft-shadow rounded-xl border border-[rgba(111,78,55,0.1)] bg-white/95 px-4 py-3 text-sm leading-relaxed text-[rgba(62,42,31,0.82)]"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="order-1 lg:order-2">
          <ImageWrapper src={aboutImage} alt="Warm interior of premium coffee shop" ratio="hero" className="coffee-soft-shadow-lg" />
          <Badge variant="dark" className="-mt-5 ml-5">
            Since 2018
          </Badge>
        </div>
      </Container>
    </section>
  );
}
