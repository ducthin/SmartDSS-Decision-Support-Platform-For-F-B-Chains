import { testimonials } from '@/assets/coffee/content';
import Container from '@/components/coffee/Container';
import SectionTitle from '@/components/coffee/SectionTitle';
import TestimonialCard from '@/components/coffee/TestimonialCard';

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-16 sm:py-20">
      <Container>
        <SectionTitle
          align="center"
          eyebrow="Testimonials"
          title="What Guests Say About the Experience"
          subtitle="A few words from our regular guests and coffee enthusiasts."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>
      </Container>
    </section>
  );
}
