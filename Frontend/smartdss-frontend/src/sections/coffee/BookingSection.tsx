import { useState } from 'react';
import { CalendarDays, Check, Clock, Phone, Users } from 'lucide-react';
import Container from '@/components/coffee/Container';
import SectionTitle from '@/components/coffee/SectionTitle';

const TIME_SLOTS = [
  '8:00', '9:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
];

interface BookingForm {
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: string;
  note: string;
}

export default function BookingSection() {
  const [form, setForm] = useState<BookingForm>({
    name: '',
    phone: '',
    date: '',
    time: '',
    guests: '2',
    note: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const set = (field: keyof BookingForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const inputCls = 'w-full rounded-[var(--coffee-radius-sm)] border border-[rgba(107,80,64,0.2)] bg-white px-3.5 py-2.5 text-sm text-[var(--coffee-dark)] placeholder-[rgba(26,14,7,0.38)] outline-none transition focus:border-[var(--coffee-primary)] focus:ring-2 focus:ring-[rgba(107,80,64,0.12)]';
  const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[rgba(26,14,7,0.6)]';

  return (
    <section id="booking" className="scroll-mt-24 py-16 sm:scroll-mt-28 sm:py-24 bg-[#fffdf9]">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          {/* Left info */}
          <div className="space-y-6">
            <SectionTitle
              eyebrow="Đặt bàn trước"
              title="Giữ chỗ cho khoảnh khắc của bạn"
              subtitle="Đặt bàn trước để có không gian tốt nhất — đặc biệt cho nhóm, tiệc nhỏ và buổi họp cà phê cuối tuần."
            />

            <div className="space-y-4">
              {[
                {
                  icon: <Clock className="h-5 w-5 text-[var(--coffee-accent)]" />,
                  title: 'Giờ mở cửa',
                  desc: 'Thứ 2 – Thứ 6: 8:00 – 22:00\nThứ 7 – Chủ nhật: 9:00 – 21:00',
                },
                {
                  icon: <Users className="h-5 w-5 text-[var(--coffee-accent)]" />,
                  title: 'Đặt bàn nhóm',
                  desc: 'Từ 6 người trở lên — miễn phí trang trí bàn & set bánh ngọt',
                },
                {
                  icon: <Phone className="h-5 w-5 text-[var(--coffee-accent)]" />,
                  title: 'Liên hệ trực tiếp',
                  desc: '(+84) 28 3821 0138\nhello@beanandbrew.vn',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-[var(--coffee-radius-md)] border border-[rgba(107,80,64,0.1)] bg-white p-4 shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--coffee-radius-sm)] bg-[rgba(201,162,122,0.15)]">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--coffee-dark)]">{item.title}</p>
                    <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-[rgba(26,14,7,0.65)]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right form */}
          <div className="coffee-soft-shadow rounded-[var(--coffee-radius-lg)] border border-[rgba(107,80,64,0.12)] bg-white p-6 sm:p-8">
            {submitted ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-[var(--coffee-dark)]">Đặt bàn thành công!</h3>
                <p className="max-w-xs text-sm text-[rgba(26,14,7,0.65)]">
                  Chúng tôi sẽ liên hệ xác nhận qua số điện thoại trong vòng 30 phút.
                </p>
                <button
                  type="button"
                  className="coffee-interactive mt-2 rounded-[var(--coffee-radius-sm)] border border-[rgba(107,80,64,0.22)] px-5 py-2.5 text-sm font-semibold text-[var(--coffee-primary)] hover:bg-[rgba(107,80,64,0.06)]"
                  onClick={() => setSubmitted(false)}
                >
                  Đặt thêm
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="mb-2 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-[var(--coffee-accent)]" />
                  <h3 className="text-lg font-bold text-[var(--coffee-dark)]">Thông tin đặt bàn</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="booking-name" className={labelCls}>Họ và tên *</label>
                    <input
                      id="booking-name"
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={form.name}
                      onChange={set('name')}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="booking-phone" className={labelCls}>Số điện thoại *</label>
                    <input
                      id="booking-phone"
                      type="tel"
                      required
                      placeholder="09xxxxxxxx"
                      value={form.phone}
                      onChange={set('phone')}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="booking-date" className={labelCls}>Ngày *</label>
                    <input
                      id="booking-date"
                      type="date"
                      required
                      min={today}
                      value={form.date}
                      onChange={set('date')}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="booking-time" className={labelCls}>Giờ *</label>
                    <select
                      id="booking-time"
                      required
                      value={form.time}
                      onChange={set('time')}
                      className={inputCls}
                    >
                      <option value="">Chọn giờ</option>
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="booking-guests" className={labelCls}>Số khách *</label>
                  <select
                    id="booking-guests"
                    required
                    value={form.guests}
                    onChange={set('guests')}
                    className={inputCls}
                  >
                    {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                      <option key={n} value={n}>{n} người</option>
                    ))}
                    <option value="11+">Trên 10 người (nhóm lớn)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="booking-note" className={labelCls}>Ghi chú</label>
                  <textarea
                    id="booking-note"
                    rows={3}
                    placeholder="Dịp đặc biệt, yêu cầu chỗ ngồi, dị ứng thức ăn..."
                    value={form.note}
                    onChange={set('note')}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                <button
                  type="submit"
                  className="coffee-interactive w-full rounded-[var(--coffee-radius-sm)] bg-gradient-to-r from-[var(--coffee-primary)] to-[var(--coffee-dark)] py-3 text-sm font-bold text-white shadow-md shadow-[rgba(107,80,64,0.3)] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coffee-accent)] focus-visible:ring-offset-2"
                >
                  Xác nhận đặt bàn
                </button>

                <p className="text-center text-xs text-[rgba(26,14,7,0.48)]">
                  Chúng tôi sẽ gọi xác nhận trong vòng 30 phút.
                </p>
              </form>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
