export interface NavItem {
  label: string;
  href: string;
}

export interface FeaturedProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  tag?: string;
  rating: number;
  reviewCount: number;
}

export interface MenuEntry {
  name: string;
  description: string;
  price: string;
  tag?: string;
}

export interface MenuCategory {
  title: string;
  subtitle: string;
  items: MenuEntry[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatar: string;
  rating: number;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumnData {
  title: string;
  links: FooterLink[];
}

export const navItems: NavItem[] = [
  { label: 'Home', href: '#home' },
  { label: 'Featured', href: '#featured' },
  { label: 'About', href: '#about' },
  { label: 'Menu', href: '#menu' },
  { label: 'Reviews', href: '#testimonials' },
  { label: 'Contact', href: '#contact' },
];

export const heroImage =
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=80';

export const heroStats = [
  { label: 'Craft recipes', value: '40+' },
  { label: 'Beans origins', value: '12' },
  { label: 'Daily visitors', value: '1.5K' },
];

export const featuredProducts: FeaturedProduct[] = [
  {
    id: 'espresso-noir',
    name: 'Espresso Noir',
    description: 'Single-origin espresso layered with dark chocolate and toasted almond notes.',
    price: '95.000 VND',
    image:
      'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=80',
    tag: 'Best Seller',
    rating: 4.9,
    reviewCount: 148,
  },
  {
    id: 'caramel-cloud',
    name: 'Caramel Cloud Latte',
    description: 'Silky milk foam, caramel drizzle, and a smooth medium roast base.',
    price: '110.000 VND',
    image:
      'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=80',
    tag: 'Seasonal',
    rating: 4.8,
    reviewCount: 97,
  },
  {
    id: 'velvet-mocha',
    name: 'Velvet Mocha',
    description: 'Premium cocoa, espresso, and cream with a whisper of cinnamon.',
    price: '120.000 VND',
    image:
      'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80',
    rating: 4.7,
    reviewCount: 84,
  },
  {
    id: 'cold-brew-reserve',
    name: 'Cold Brew Reserve',
    description: '18-hour brew extraction for crisp body and naturally sweet finish.',
    price: '105.000 VND',
    image:
      'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=900&q=80',
    tag: 'Limited',
    rating: 4.9,
    reviewCount: 126,
  },
];

export const aboutImage =
  'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=1200&q=80';

export const aboutHighlights = [
  'Hand-selected beans sourced from small farms in Ethiopia, Colombia, and Vietnam.',
  'Small-batch roasting for consistent flavor and aromatic depth in every cup.',
  'A calm lounge inspired by Japanese minimal interiors and European coffee bars.',
];

export const menuCategories: MenuCategory[] = [
  {
    title: 'Signature Espresso',
    subtitle: 'Bold and aromatic classics with a premium touch.',
    items: [
      { name: 'Espresso Doppio', description: 'Double shot, rich crema', price: '70.000 VND' },
      { name: 'Cortado Atelier', description: 'Equal parts espresso and steamed milk', price: '82.000 VND' },
      { name: 'Brown Sugar Americano', description: 'Smooth bitterness with caramelized sweetness', price: '78.000 VND' },
    ],
  },
  {
    title: 'Milk Creations',
    subtitle: 'Creamy profiles crafted for comfort and balance.',
    items: [
      { name: 'Velvet Cappuccino', description: 'Fine foam with cocoa dust', price: '92.000 VND', tag: 'Popular' },
      { name: 'Maple Oat Latte', description: 'Oat milk and maple syrup blend', price: '115.000 VND' },
      { name: 'Honey Cinnamon Flat White', description: 'Silky milk with warm spice notes', price: '108.000 VND' },
    ],
  },
  {
    title: 'Slow Bar Specials',
    subtitle: 'Slow extraction methods for layered complexity.',
    items: [
      { name: 'V60 Geisha', description: 'Floral aroma with citrus finish', price: '140.000 VND', tag: 'Premium' },
      { name: 'Chemex House Blend', description: 'Clean body, bright fruit acidity', price: '125.000 VND' },
      { name: 'Cold Drip Reserve', description: '10-hour ice drip extraction', price: '132.000 VND' },
    ],
  },
];

export const testimonials: Testimonial[] = [
  {
    id: 't1',
    name: 'An Nguyen',
    role: 'Art Director',
    quote:
      'The atmosphere is elegant without trying too hard. Espresso Noir has become my weekly ritual.',
    avatar:
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=256&q=80',
    rating: 5,
  },
  {
    id: 't2',
    name: 'Liam Tran',
    role: 'Product Designer',
    quote:
      'Beautiful visual identity, friendly staff, and coffee quality that feels truly premium from first sip.',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    rating: 5,
  },
  {
    id: 't3',
    name: 'Maria Le',
    role: 'Entrepreneur',
    quote:
      'It is my go-to meeting spot. The menu feels curated and every drink arrives with great presentation.',
    avatar:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    rating: 4.8,
  },
];

export const footerColumns: FooterColumnData[] = [
  {
    title: 'Explore',
    links: [
      { label: 'Featured Drinks', href: '#featured' },
      { label: 'Our Story', href: '#about' },
      { label: 'Full Menu', href: '#menu' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Reservations', href: '#contact' },
      { label: 'Delivery', href: '#menu' },
      { label: 'Contact Team', href: '#contact' },
    ],
  },
];
