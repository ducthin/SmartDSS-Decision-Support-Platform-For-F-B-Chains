import { menuCategories } from '@/assets/coffee/content';
import Badge from '@/components/coffee/Badge';
import Card from '@/components/coffee/Card';
import Container from '@/components/coffee/Container';
import SectionTitle from '@/components/coffee/SectionTitle';

export default function MenuSection() {
  return (
    <section id="menu" className="py-16 sm:py-20">
      <Container>
        <SectionTitle
          align="center"
          eyebrow="Menu Highlights"
          title="Curated Menu with Distinct Flavor Profiles"
          subtitle="Each category is designed to match mood, moment, and taste intensity."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {menuCategories.map((category) => (
            <Card key={category.title} hover className="space-y-5 border border-[rgba(111,78,55,0.12)] bg-white/95 p-5">
              <div>
                <h3 className="text-2xl font-semibold text-[var(--coffee-dark)]">{category.title}</h3>
                <p className="mt-1 text-sm text-[rgba(62,42,31,0.75)]">{category.subtitle}</p>
              </div>

              <ul className="space-y-3">
                {category.items.map((item) => (
                  <li key={item.name} className="rounded-xl border border-[rgba(111,78,55,0.1)] bg-[#fffcf7] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--coffee-dark)]">{item.name}</p>
                          {item.tag ? <Badge className="px-2 py-0.5 text-[10px]">{item.tag}</Badge> : null}
                        </div>
                        <p className="text-xs text-[rgba(62,42,31,0.72)]">{item.description}</p>
                      </div>
                      <p className="shrink-0 text-xs font-semibold text-[var(--coffee-primary)]">{item.price}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
