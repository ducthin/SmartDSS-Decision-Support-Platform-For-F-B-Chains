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
  emoji: string;
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

export interface Promotion {
  id: string;
  title: string;
  description: string;
  badge: string;
  color: string;
  bgColor: string;
  icon: string;
  validUntil?: string;
}

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  caption: string;
}

/** Thương hiệu: đồ uống craft + ẩm thực nhẹ — không chỉ cà phê. */
export const brandName = 'Bean & Brew';
export const brandTagline = 'Đồ uống craft · Bánh tươi · Món nhẹ';

export const navItems: NavItem[] = [
  { label: 'Trang chủ', href: '#home' },
  { label: 'Món nổi bật', href: '#featured' },
  { label: 'Câu chuyện', href: '#about' },
  { label: 'Thực đơn', href: '/menu' },
  { label: 'Ưu đãi', href: '#promotions' },
  { label: 'Đặt bàn', href: '#booking' },
  { label: 'Liên hệ', href: '#contact' },
];

/** Dải thông điệp — lặp trong marquee */
export const trustStripItems = [
  'Nguyên liệu tươi mỗi ngày',
  'Đồ uống pha tay',
  'Bánh & món nhẹ handmade',
  'Thực đơn thay đổi theo mùa',
  'Giao nhanh nội thành',
  'Ưu đãi đặt nhóm & tiệc nhỏ',
  'Wi-Fi miễn phí',
  'Không gian làm việc thoải mái',
  'Phục vụ từ 8h – 22h',
];

export const heroImage =
  'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1400&q=80';

export const heroStats = [
  { label: 'Món trong thực đơn', value: '40+' },
  { label: 'Khách hàng mỗi tháng', value: '8K+' },
  { label: 'Năm phục vụ', value: '12' },
  { label: 'Đánh giá 5 sao', value: '98%' },
];

export const featuredProducts: FeaturedProduct[] = [
  {
    id: 'espresso-house',
    name: 'Espresso House Đặc Trưng',
    description:
      'Blend rang vừa: thơm sô-cô-la, caramel hóa than — ly đậm cho buổi sáng hoặc sau bữa trưa.',
    price: '55.000 ₫',
    image:
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80',
    tag: 'Bán chạy',
    rating: 4.9,
    reviewCount: 212,
  },
  {
    id: 'tra-sa-gung',
    name: 'Trà sả gừng mật ong',
    description:
      'Không caffeine: sả thơm, gừng ấm, mật ong hoa nhã — phù hợp cả trẻ em và khách giảm cà phê.',
    price: '48.000 ₫',
    image:
      'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=900&q=80',
    tag: 'Không cafein',
    rating: 4.8,
    reviewCount: 156,
  },
  {
    id: 'croissant-la-dua',
    name: 'Croissant bơ lá dứa',
    description:
      'Men chậm qua đêm, bơ lạt, lớp lá dứa thơm — giòn bên ngoài, xốp bên trong, nướng theo lô nhỏ.',
    price: '42.000 ₫',
    image:
      'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=900&q=80',
    tag: 'Mới ra lò',
    rating: 4.7,
    reviewCount: 189,
  },
  {
    id: 'benedict-brunch',
    name: 'Trứng Benedict bánh muffin',
    description:
      'Trứng chần lòng đào, sốt hollandaise béo vừa, giăm bông xông khói và salad nhỏ — set brunch đủ no.',
    price: '185.000 ₫',
    image:
      'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=900&q=80',
    tag: 'Brunch',
    rating: 4.9,
    reviewCount: 94,
  },
  {
    id: 'matcha-latte',
    name: 'Matcha Latte Nhật Bản',
    description:
      'Matcha ceremony grade pha cùng sữa tươi hấp nóng — vị chát nhẹ, ngọt dịu, màu xanh bắt mắt.',
    price: '72.000 ₫',
    image:
      'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=900&q=80',
    tag: 'Đặc biệt',
    rating: 4.8,
    reviewCount: 178,
  },
];

export const aboutImage =
  'https://images.unsplash.com/photo-1453614512568-c4024d13c247?auto=format&fit=crop&w=1200&q=80';

export const aboutHighlights = [
  ' Bếp và quầy bar cùng một triết lý: nguyên liệu rõ nguồn, chế biến tỉ mỉ, trình bày gọn gàng.',
  ' Thực đơn xoay vòng theo mùa: trái cây địa phương, thảo mộc, và hạt rang từ đối tác tin cậy.',
  ' Không gian vừa để làm việc nhẹ, vừa để họp nhóm — ấm, yên, có Wi-Fi tốc độ cao.',
  ' Đặt hàng & thanh toán qua QR — không cần chờ nhân viên, nhận ngay tại bàn.',
];

export const menuCategories: MenuCategory[] = [
  {
    title: 'Đồ uống signature',
    subtitle: 'Cà phê, trà artisan, sinh tố và đồ lạnh — pha theo đơn.',
    emoji: '☕',
    items: [
      { name: 'Espresso Đôi', description: 'Hai shot, crema dày', price: '65.000 ₫' },
      { name: 'Latte lá dứa', description: 'Sữa tươi, siro lá dứa nhà làm', price: '58.000 ₫', tag: 'Phổ biến' },
      { name: 'Cold Brew đá bào', description: 'Ủ lạnh 18 giờ, pha phin chậm', price: '62.000 ₫', tag: 'Mới' },
      { name: 'Trà sả gừng mật ong', description: 'Sả, gừng tươi, mật ong hoa', price: '48.000 ₫' },
      {
        name: 'Sinh tố xoài sữa chua',
        description: 'Xoài chín, sữa chua Hy Lạp, đá xay',
        price: '62.000 ₫',
      },
    ],
  },
  {
    title: 'Bánh & món ngọt',
    subtitle: 'Bánh men, tart và bánh ngọt nhỏ mỗi ngày.',
    emoji: '🥐',
    items: [
      { name: 'Croissant bơ lá dứa', description: 'Men chậm qua đêm, bơ lạt Pháp', price: '42.000 ₫', tag: 'Hot' },
      { name: 'Tiramisu cốc', description: 'Mascarpone, cà phê cold brew nhà pha', price: '72.000 ₫' },
      { name: 'Tart chanh merengue', description: 'Vỏ bơ giòn, chanh thanh, merengue nhẹ', price: '68.000 ₫', tag: 'Theo mùa' },
      { name: 'Bánh mì bơ tỏi', description: 'Baguette giòn, bơ tỏi thảo mộc', price: '35.000 ₫' },
      { name: 'Cookies chocolate chunk', description: 'Lò nướng tại chỗ, 3 chiếc', price: '45.000 ₫' },
    ],
  },
  {
    title: 'Món nhẹ & brunch',
    subtitle: 'Ăn nhẹ không ngấy — phù hợp trưa vội hoặc tối muộn.',
    emoji: '🍳',
    items: [
      { name: 'Trứng Benedict bánh muffin', description: 'Trứng chần, sốt hollandaise, giăm bông', price: '185.000 ₫', tag: 'Brunch' },
      { name: 'Sandwich gà nướng rau củ', description: 'Bánh mì sourdough, sốt yogurt thảo mộc', price: '125.000 ₫' },
      { name: 'Salad quinoa rau mầm', description: 'Sốt chanh dâu, hạt giòn', price: '98.000 ₫', tag: 'Healthy' },
      { name: 'Mì ý sốt kem nấm chay', description: 'Kem nấm aromat, tiêu đen, parmesan', price: '135.000 ₫', tag: 'Chay' },
    ],
  },
];

export const promotions: Promotion[] = [
  {
    id: 'promo-1',
    title: 'Combo Sáng Tiết Kiệm',
    description: 'Đặt 1 đồ uống + 1 bánh — giảm ngay 20%. Áp dụng từ 8h–11h các ngày thường.',
    badge: 'Giảm 20%',
    color: '#6b5040',
    bgColor: 'rgba(201,162,122,0.12)',
    icon: '',
    validUntil: '31/12/2025',
  },
  {
    id: 'promo-2',
    title: 'Nhóm Từ 4 Người',
    description: 'Đặt bàn cho 4 người trở lên — miễn phí 1 set bánh ngọt theo mùa.',
    badge: 'Tặng bánh',
    color: '#5a7a3a',
    bgColor: 'rgba(90,122,58,0.1)',
    icon: '',
    validUntil: '31/12/2025',
  },
  {
    id: 'promo-3',
    title: 'Thành Viên Mới',
    description: 'Đăng ký số điện thoại lần đầu qua QR — nhận ngay voucher giảm 15K đơn tiếp theo.',
    badge: '−15.000 ₫',
    color: '#7a3a5a',
    bgColor: 'rgba(122,58,90,0.08)',
    icon: '',
  },
];

export const galleryImages: GalleryImage[] = [
  {
    id: 'g1',
    src: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    alt: 'Không gian quán ấm cúng',
    caption: 'Không gian ấm cúng',
  },
  {
    id: 'g2',
    src: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
    alt: 'Pha chế espresso tại quầy bar',
    caption: 'Pha chế thủ công',
  },
  {
    id: 'g3',
    src: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80',
    alt: 'Ly cà phê latte art đẹp mắt',
    caption: 'Latte Art đặc trưng',
  },
  {
    id: 'g4',
    src: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80',
    alt: 'Bánh croissant nướng tươi',
    caption: 'Bánh handmade mỗi ngày',
  },
  {
    id: 'g5',
    src: 'https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=800&q=80',
    alt: 'Set brunch đầy đủ tại quán',
    caption: 'Brunch cuối tuần',
  },
  {
    id: 'g6',
    src: 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?auto=format&fit=crop&w=800&q=80',
    alt: 'Khu ngồi ngoài trời xanh mát',
    caption: 'Góc ngoài trời',
  },
];

export const testimonials: Testimonial[] = [
  {
    id: 't1',
    name: 'Minh Anh',
    role: 'TP. Hồ Chí Minh',
    quote:
      'Hay ngồi làm việc buổi sáng: espresso ổn định, croissant luôn nóng. Trưa gọi Benedict là đủ năng lượng cả ngày.',
    avatar:
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=256&q=80',
    rating: 5,
  },
  {
    id: 't2',
    name: 'Thu Hà',
    role: 'Hà Nội',
    quote:
      'Con tôi uống trà sả gừng, mình uống latte — thực đơn rõ ràng, không gian yên. Giao đồ ăn vẫn giòn, ghi nhận.',
    avatar:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    rating: 5,
  },
  {
    id: 't3',
    name: 'Quang Dũng',
    role: 'Đà Nẵng',
    quote:
      'Đặt tiệc sinh nhật nhỏ 12 người: bánh, đồ uống và món nhẹ được set sẵn. Đội ngũ lịch sự, đúng giờ.',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    rating: 4.9,
  },
  {
    id: 't4',
    name: 'Lan Anh',
    role: 'TP. Hồ Chí Minh',
    quote:
      'Đặt qua QR siêu tiện, không cần gọi nhân viên. Tiramisu và cold brew là combo tôi order mỗi lần ghé.',
    avatar:
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=256&q=80',
    rating: 5,
  },
  {
    id: 't5',
    name: 'Hữu Phước',
    role: 'Bình Dương',
    quote:
      'Không gian cực kỳ phù hợp để làm việc remote. Wi-Fi nhanh, đồ uống ngon, nhân viên thân thiện. Highly recommend!',
    avatar:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
    rating: 5,
  },
  {
    id: 't6',
    name: 'Bảo Ngọc',
    role: 'TP. Hồ Chí Minh',
    quote:
      'Latte lá dứa là món không thể thiếu mỗi sáng. Thực đơn theo mùa luôn có điều bất ngờ — tuần nào cũng muốn quay lại.',
    avatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=256&q=80',
    rating: 5,
  },
];

export const footerColumns: FooterColumnData[] = [
  {
    title: 'Khám phá',
    links: [
      { label: 'Món nổi bật', href: '#featured' },
      { label: 'Câu chuyện thương hiệu', href: '#about' },
      { label: 'Toàn bộ thực đơn', href: '#menu' },
      { label: 'Ưu đãi & khuyến mãi', href: '#promotions' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Đặt bàn / tiệc nhỏ', href: '#contact' },
      { label: 'Giao hàng & take-away', href: '#menu' },
      { label: 'Đặt hàng qua QR', href: '#featured' },
      { label: 'Liên hệ đội ngũ', href: '#contact' },
    ],
  },
];
