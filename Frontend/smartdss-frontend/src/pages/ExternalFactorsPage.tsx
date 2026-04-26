import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Cloud, Plus, Edit2, Trash2,
  Calendar, MapPin, RefreshCw,
  ChevronLeft, ChevronRight,
  Phone, Search, Tag, Trophy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleKey } from '@/utils/helpers';
import { weatherService } from '@/services/weatherService';
import { eventService } from '@/services/eventService';
import { holidayService } from '@/services/holidayService';
import { voucherService } from '@/services/voucherService';
import { loyaltyService } from '@/services/loyaltyService';
import { areaBusynessService } from '@/services/areaBusynessService';
import type {
  WeatherData, Event, EventForm, EventType, ImpactLevel,
  HolidayCalendar, HolidayCalendarForm, HolidayType,
  AreaBusyness, Voucher, VoucherForm, VoucherDiscountType, LoyaltyAccount,
} from '@/types';
import WeatherTab from '@/components/external/WeatherTab';
import EventModal from '@/components/external/EventModal';
import HolidayModal from '@/components/external/HolidayModal';
import VoucherModal from '@/components/external/VoucherModal';

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  FESTIVAL: 'Lễ hội', HOLIDAY: 'Ngày nghỉ', CONCERT: 'Hòa nhạc',
  SPORT: 'Thể thao', PROMOTION: 'Khuyến mãi', CONFERENCE: 'Hội nghị', OTHER: 'Khác',
};
const EVENT_TYPE_COLORS: Record<EventType, string> = {
  FESTIVAL: 'bg-purple-100 text-purple-700', HOLIDAY: 'bg-red-100 text-red-700',
  CONCERT: 'bg-pink-100 text-pink-700', SPORT: 'bg-green-100 text-green-700',
  PROMOTION: 'bg-yellow-100 text-yellow-700', CONFERENCE: 'bg-blue-100 text-blue-700',
  OTHER: 'bg-gray-100 text-gray-700',
};
const IMPACT_LABELS: Record<ImpactLevel, string> = {
  LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Rất cao',
};
const IMPACT_COLORS: Record<ImpactLevel, string> = {
  LOW: 'bg-green-100 text-green-700', MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700', CRITICAL: 'bg-red-100 text-red-700',
};
const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  PUBLIC_HOLIDAY: 'Lễ quốc gia', CULTURAL: 'Văn hóa', RELIGIOUS: 'Tôn giáo',
  SCHOOL: 'Học đường', COMPANY: 'Công ty', OTHER: 'Khác',
};
const HOLIDAY_TYPE_COLORS: Record<HolidayType, string> = {
  PUBLIC_HOLIDAY: 'bg-red-100 text-red-700', CULTURAL: 'bg-purple-100 text-purple-700',
  RELIGIOUS: 'bg-amber-100 text-amber-700', SCHOOL: 'bg-blue-100 text-blue-700',
  COMPANY: 'bg-teal-100 text-teal-700', OTHER: 'bg-gray-100 text-gray-700',
};

const VOUCHER_DISCOUNT_TYPE_LABELS: Record<VoucherDiscountType, string> = {
  PERCENT: 'Phần trăm',
  FIXED: 'Số tiền',
};

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const CUSTOMER_PHONE_REGEX = /^[+0-9][0-9]{8,19}$/;

type Tab = 'weather' | 'calendar' | 'vouchers' | 'loyalty';

const emptyEventForm: EventForm = {
  name: '', description: '', eventType: 'FESTIVAL', startDate: '', endDate: '',
  location: '', expectedImpact: 'MEDIUM', notes: '', discountPercent: 0, active: true,
};
const emptyHolidayForm: HolidayCalendarForm = {
  name: '', holidayDate: '', holidayType: 'PUBLIC_HOLIDAY', recurring: false, description: '', discountPercent: 0,
};
const emptyVoucherForm: VoucherForm = {
  code: '',
  name: '',
  description: '',
  discountType: 'PERCENT',
  discountValue: 10,
  minOrderAmount: 0,
  maxDiscountAmount: undefined,
  validFrom: undefined,
  validTo: undefined,
  active: true,
  usageLimit: undefined,
};

export default function ExternalFactorsPage() {
  const { user } = useAuth();
  const role = getRoleKey(user?.roleName);
  const canEdit = role === 'ADMIN' || role === 'MANAGER';

  const [tab, setTab] = useState<Tab>('calendar');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherRange, setWeatherRange] = useState<WeatherData[]>([]);
  const [areaBusyness, setAreaBusyness] = useState<AreaBusyness | null>(null);
  const [loadingAreaBusyness, setLoadingAreaBusyness] = useState(false);
  const [loading, setLoading] = useState(true);

  // Calendar state
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [monthEvents, setMonthEvents] = useState<Event[]>([]);
  const [monthHolidays, setMonthHolidays] = useState<HolidayCalendar[]>([]);
  const [calRefresh, setCalRefresh] = useState(0);

  // Event state
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventForm, setEventForm] = useState<EventForm>(emptyEventForm);

  // Holiday state
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayCalendar | null>(null);
  const [holidayForm, setHolidayForm] = useState<HolidayCalendarForm>(emptyHolidayForm);
  const [syncing, setSyncing] = useState(false);

  // Voucher state
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [voucherForm, setVoucherForm] = useState<VoucherForm>(emptyVoucherForm);

  // Loyalty state
  const [loyaltyPhone, setLoyaltyPhone] = useState('');
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(null);
  const [loyaltyAccounts, setLoyaltyAccounts] = useState<LoyaltyAccount[]>([]);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);
  const [loadingLoyaltyAccounts, setLoadingLoyaltyAccounts] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState('');

  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const toDateTimeLocalValue = (value?: string) => {
    if (!value) return '';
    return value.length >= 16 ? value.slice(0, 16) : value;
  };

  const formatCurrency = (amount?: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const formatDateTime = (value?: string) =>
    value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có';

  const todayStr = toLocalDateStr(new Date());

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [calYear, calMonth]);

  const getDateStr = (day: number) =>
    `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const eventsForDate = (dateStr: string) =>
    monthEvents.filter(e => e.startDate <= dateStr && e.endDate >= dateStr);

  const holidaysForDate = (dateStr: string) =>
    monthHolidays.filter(h => h.holidayDate === dateStr);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };
  const goToday = () => {
    const now = new Date();
    setCalMonth(now.getMonth());
    setCalYear(now.getFullYear());
    setSelectedDate(todayStr);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadingAreaBusyness(true);

      const today = new Date();
      const from = toLocalDateStr(today);
      const to7 = new Date(today); to7.setDate(to7.getDate() + 6);

      try {
        // Tải thời tiết song song để giảm thời gian khởi tạo màn hình.
        const [todayRes, rangeRes] = await Promise.all([
          weatherService.getToday().catch(() => ({ data: { data: null } })),
          weatherService.getRange(from, toLocalDateStr(to7)).catch(() => ({ data: { data: [] } })),
        ]);

        if (!cancelled) {
          setWeather(todayRes.data.data);
          setWeatherRange(rangeRes.data.data || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      // Dữ liệu mật độ khu vực thường chậm hơn, tải nền để không block UI.
      areaBusynessService.getCurrent()
        .then((res) => {
          if (!cancelled) setAreaBusyness(res.data.data);
        })
        .catch(() => {
          if (!cancelled) setAreaBusyness(null);
        })
        .finally(() => {
          if (!cancelled) setLoadingAreaBusyness(false);
        });
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const loadCalendar = useCallback(() => {
    const from = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
    const to = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    Promise.all([
      eventService.getRange(from, to).catch(() => ({ data: { data: [] } })),
      holidayService.getRange(from, to).catch(() => ({ data: { data: [] } })),
    ]).then(([evRes, holRes]) => {
      setMonthEvents(evRes.data.data || []);
      setMonthHolidays(holRes.data.data || []);
    });
  }, [calMonth, calYear]);

  const loadVouchers = useCallback(() => {
    setLoadingVouchers(true);
    voucherService.getAll(0, 100)
      .then((res) => {
        setVouchers(res.data.data.content || []);
      })
      .catch(() => {
        setVouchers([]);
      })
      .finally(() => {
        setLoadingVouchers(false);
      });
  }, []);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar, calRefresh]);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers, calRefresh]);

  const loadLoyaltyAccounts = useCallback(() => {
    setLoadingLoyaltyAccounts(true);
    loyaltyService.getAll()
      .then((res) => {
        setLoyaltyAccounts(res.data.data || []);
      })
      .catch(() => {
        setLoyaltyAccounts([]);
      })
      .finally(() => {
        setLoadingLoyaltyAccounts(false);
      });
  }, []);

  useEffect(() => {
    loadLoyaltyAccounts();
  }, [loadLoyaltyAccounts]);

  // Event CRUD
  const openEventCreate = () => {
    setEditingEvent(null);
    setEventForm({ ...emptyEventForm, startDate: selectedDate || todayStr, endDate: selectedDate || todayStr });
    setShowEventModal(true);
  };
  const openEventEdit = (e: Event) => {
    setEditingEvent(e);
    setEventForm({
      name: e.name, description: e.description || '', eventType: e.eventType,
      startDate: e.startDate, endDate: e.endDate, location: e.location || '',
      expectedImpact: e.expectedImpact, notes: e.notes || '', discountPercent: e.discountPercent || 0, active: e.active,
    });
    setShowEventModal(true);
  };
  const saveEvent = async () => {
    try {
      if (editingEvent) {
        await eventService.update(editingEvent.id, eventForm);
        toast.success('Cập nhật sự kiện thành công');
      } else {
        await eventService.create(eventForm);
        toast.success('Tạo sự kiện thành công');
      }
      setShowEventModal(false);
      setCalRefresh(n => n + 1);
    } catch { toast.error('Lỗi lưu sự kiện'); }
  };
  const deleteEvent = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa sự kiện này?')) return;
    try {
      await eventService.delete(id);
      toast.success('Đã xóa sự kiện');
      setCalRefresh(n => n + 1);
    } catch { toast.error('Lỗi xóa sự kiện'); }
  };

  // Holiday CRUD
  const openHolidayCreate = () => {
    setEditingHoliday(null);
    setHolidayForm({ ...emptyHolidayForm, holidayDate: selectedDate || todayStr });
    setShowHolidayModal(true);
  };
  const openHolidayEdit = (h: HolidayCalendar) => {
    setEditingHoliday(h);
    setHolidayForm({
      name: h.name, holidayDate: h.holidayDate, holidayType: h.holidayType,
      recurring: h.recurring, description: h.description || '', discountPercent: h.discountPercent || 0,
    });
    setShowHolidayModal(true);
  };
  const saveHoliday = async () => {
    try {
      if (editingHoliday) {
        await holidayService.update(editingHoliday.id, holidayForm);
        toast.success('Cập nhật ngày lễ thành công');
      } else {
        await holidayService.create(holidayForm);
        toast.success('Tạo ngày lễ thành công');
      }
      setShowHolidayModal(false);
      setCalRefresh(n => n + 1);
    } catch { toast.error('Lỗi lưu ngày lễ'); }
  };
  const deleteHoliday = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa ngày lễ này?')) return;
    try {
      await holidayService.delete(id);
      toast.success('Đã xóa ngày lễ');
      setCalRefresh(n => n + 1);
    } catch { toast.error('Lỗi xóa ngày lễ'); }
  };

  const syncHolidays = async () => {
    setSyncing(true);
    try {
      const res = await holidayService.sync(calYear);
      const total = res.data.data || 0;
      toast.success(`Đã thêm ${total} ngày lễ mới cho năm ${calYear}`);
      setCalRefresh(n => n + 1);
    } catch { toast.error('Lỗi đồng bộ ngày lễ'); }
    finally { setSyncing(false); }
  };

  // Voucher CRUD
  const openVoucherCreate = () => {
    setEditingVoucher(null);
    setVoucherForm(emptyVoucherForm);
    setShowVoucherModal(true);
  };

  const openVoucherEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setVoucherForm({
      code: voucher.code,
      name: voucher.name,
      description: voucher.description || '',
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      minOrderAmount: voucher.minOrderAmount,
      maxDiscountAmount: voucher.maxDiscountAmount,
      validFrom: toDateTimeLocalValue(voucher.validFrom),
      validTo: toDateTimeLocalValue(voucher.validTo),
      active: voucher.active,
      usageLimit: voucher.usageLimit,
    });
    setShowVoucherModal(true);
  };

  const saveVoucher = async () => {
    try {
      const payload: VoucherForm = {
        ...voucherForm,
        code: voucherForm.code.trim().toUpperCase(),
        name: voucherForm.name.trim(),
        description: voucherForm.description?.trim() || undefined,
        validFrom: voucherForm.validFrom || undefined,
        validTo: voucherForm.validTo || undefined,
      };

      if (editingVoucher) {
        await voucherService.update(editingVoucher.id, payload);
        toast.success('Cập nhật voucher thành công');
      } else {
        await voucherService.create(payload);
        toast.success('Tạo voucher thành công');
      }
      setShowVoucherModal(false);
      setCalRefresh(n => n + 1);
    } catch {
      toast.error('Lỗi lưu voucher');
    }
  };

  const deleteVoucher = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa voucher này?')) return;
    try {
      await voucherService.delete(id);
      toast.success('Đã xóa voucher');
      setCalRefresh(n => n + 1);
    } catch {
      toast.error('Lỗi xóa voucher');
    }
  };

  const lookupLoyaltyAccount = async () => {
    const normalizedPhone = loyaltyPhone.replace(/\s+/g, '').trim();
    if (!CUSTOMER_PHONE_REGEX.test(normalizedPhone)) {
      setLoyaltyAccount(null);
      setLoyaltyError('Số điện thoại không hợp lệ');
      toast.error('Số điện thoại không hợp lệ');
      return;
    }

    setLoadingLoyalty(true);
    setLoyaltyError('');
    try {
      const res = await loyaltyService.getByPhone(normalizedPhone);
      setLoyaltyPhone(normalizedPhone);
      setLoyaltyAccount(res.data.data);
      loadLoyaltyAccounts();
    } catch {
      setLoyaltyAccount(null);
      setLoyaltyError('Không thể tải thông tin tích điểm');
      toast.error('Không thể tải thông tin tích điểm');
    } finally {
      setLoadingLoyalty(false);
    }
  };

  const fetchWeatherNow = async () => {
    try {
      const res = await weatherService.fetchNow();
      setWeather(res.data.data);
      toast.success('Đã cập nhật thời tiết');
    } catch { toast.error('Lỗi cập nhật thời tiết'); }
  };

  const fetchAreaBusyness = async () => {
    setLoadingAreaBusyness(true);
    try {
      const res = await areaBusynessService.getCurrent();
      setAreaBusyness(res.data.data);
      toast.success('Đã cập nhật phân tích mật độ khu vực');
    } catch {
      toast.error('Không thể phân tích mật độ khu vực. Hãy kiểm tra vị trí quán trong Cài đặt.');
    } finally {
      setLoadingAreaBusyness(false);
    }
  };

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : [];
  const selectedHolidays = selectedDate ? holidaysForDate(selectedDate) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Yếu tố bên ngoài</h1>

      {/* Tabs */}
      <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
        {([
          { key: 'weather' as Tab, label: 'Thời tiết', icon: Cloud },
          { key: 'calendar' as Tab, label: 'Lịch sự kiện & ngày lễ', icon: Calendar },
          { key: 'vouchers' as Tab, label: 'Voucher', icon: Tag },
          { key: 'loyalty' as Tab, label: 'Tích điểm SĐT', icon: Trophy },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${tab === t.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* WEATHER TAB */}
      {tab === 'weather' && (
        <WeatherTab
          weather={weather}
          weatherRange={weatherRange}
          areaBusyness={areaBusyness}
          loadingAreaBusyness={loadingAreaBusyness}
          canEdit={canEdit}
          onFetchNow={fetchWeatherNow}
          onRefreshAreaBusyness={fetchAreaBusyness}
        />
      )}

      {/* CALENDAR TAB */}
      {tab === 'calendar' && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Ngày lễ</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Sự kiện</span>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <button onClick={syncHolidays} disabled={syncing}
                  className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                  <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngày lễ'}
                </button>
                <button onClick={openEventCreate} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
                  <Plus size={16} /> Sự kiện
                </button>
                <button onClick={openHolidayCreate} className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-purple-700">
                  <Plus size={16} /> Ngày lễ
                </button>
              </div>
            )}
          </div>

          {/* Calendar grid */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-lg font-semibold min-w-45 text-center">
                  Tháng {calMonth + 1}, {calYear}
                </h2>
                <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>
              <button onClick={goToday} className="text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                Hôm nay
              </button>
            </div>
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={i} className="min-h-22.5 bg-gray-50/50 border-b border-r border-gray-100" />;
                const dateStr = getDateStr(day);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const dayEvts = eventsForDate(dateStr);
                const dayHols = holidaysForDate(dateStr);
                return (
                  <div key={i} onClick={() => setSelectedDate(dateStr)}
                    className={`min-h-22.5 p-1.5 border-b border-r border-gray-100 cursor-pointer transition-colors
                      ${isSelected ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : 'hover:bg-gray-50'}
                      ${isToday && !isSelected ? 'bg-amber-50/50' : ''}`}>
                    <div className="mb-1">
                      <span className={`text-sm leading-none ${isToday
                        ? 'bg-blue-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center font-bold'
                        : 'text-gray-700 font-medium'}`}>{day}</span>
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayHols.slice(0, 2).map((h) => (
                        <div key={`h${h.id}`} className="text-[10px] leading-tight px-1 py-0.5 rounded bg-red-100 text-red-700 truncate">
                          {h.name}{(h.discountPercent || 0) > 0 ? ` (-${h.discountPercent}%)` : ''}
                        </div>
                      ))}
                      {dayEvts.slice(0, 2).map((e) => (
                        <div key={`e${e.id}`} className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${EVENT_TYPE_COLORS[e.eventType]}`}>
                          {e.name}{(e.discountPercent || 0) > 0 ? ` (-${e.discountPercent}%)` : ''}
                        </div>
                      ))}
                      {(dayHols.length + dayEvts.length) > 4 && (
                        <div className="text-[10px] text-gray-400 pl-1">+{dayHols.length + dayEvts.length - 4} khác</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected date detail */}
          {selectedDate && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-lg mb-4">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              {selectedHolidays.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Ngày lễ ({selectedHolidays.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedHolidays.map((h) => (
                      <div key={h.id} className="flex items-center justify-between bg-red-50 rounded-lg p-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${HOLIDAY_TYPE_COLORS[h.holidayType]}`}>{HOLIDAY_TYPE_LABELS[h.holidayType]}</span>
                            {(h.discountPercent || 0) > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Giảm {h.discountPercent}%</span>}
                            {h.recurring && <span className="text-xs text-blue-500">🔄 Hàng năm</span>}
                          </div>
                          <p className="font-medium">{h.name}</p>
                          {h.description && <p className="text-sm text-gray-500 mt-0.5">{h.description}</p>}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 ml-3 shrink-0">
                            <button onClick={() => openHolidayEdit(h)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded"><Edit2 size={16} /></button>
                            <button onClick={() => deleteHoliday(h.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"><Trash2 size={16} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedEvents.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Sự kiện ({selectedEvents.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedEvents.map((e) => (
                      <div key={e.id} className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_COLORS[e.eventType]}`}>{EVENT_TYPE_LABELS[e.eventType]}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${IMPACT_COLORS[e.expectedImpact]}`}>{IMPACT_LABELS[e.expectedImpact]}</span>
                            {(e.discountPercent || 0) > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Giảm {e.discountPercent}%</span>}
                            {e.active && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Hoạt động</span>}
                          </div>
                          <p className="font-medium">{e.name}</p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {new Date(e.startDate).toLocaleDateString('vi-VN')} — {new Date(e.endDate).toLocaleDateString('vi-VN')}
                            {e.location && <> · <MapPin size={12} className="inline" /> {e.location}</>}
                          </p>
                          {e.description && <p className="text-sm text-gray-400 mt-0.5">{e.description}</p>}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 ml-3 shrink-0">
                            <button onClick={() => openEventEdit(e)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded"><Edit2 size={16} /></button>
                            <button onClick={() => deleteEvent(e.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"><Trash2 size={16} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedHolidays.length === 0 && selectedEvents.length === 0 && (
                <p className="text-gray-400 text-sm py-2">Không có sự kiện hoặc ngày lễ nào trong ngày này</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'vouchers' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Voucher khuyến mãi</h3>
              <p className="text-xs text-gray-500">Quản lý mã giảm giá dùng cho POS và QR order</p>
            </div>
            {canEdit && (
              <button onClick={openVoucherCreate} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700">
                <Plus size={16} /> Thêm voucher
              </button>
            )}
          </div>

          {loadingVouchers ? (
            <p className="text-sm text-gray-500">Đang tải voucher...</p>
          ) : vouchers.length === 0 ? (
            <p className="text-sm text-gray-400">Chưa có voucher nào</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-2 py-2">Mã</th>
                    <th className="px-2 py-2">Nội dung</th>
                    <th className="px-2 py-2">Giảm</th>
                    <th className="px-2 py-2">Điều kiện</th>
                    <th className="px-2 py-2">Trạng thái</th>
                    <th className="px-2 py-2">Lượt dùng</th>
                    {canEdit && <th className="px-2 py-2 text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v) => (
                    <tr key={v.id} className="border-b border-gray-100 align-top">
                      <td className="px-2 py-2 font-semibold text-indigo-700">{v.code}</td>
                      <td className="px-2 py-2">
                        <p className="font-medium text-gray-800">{v.name}</p>
                        {v.description && <p className="text-xs text-gray-500">{v.description}</p>}
                      </td>
                      <td className="px-2 py-2">
                        {v.discountType === 'PERCENT'
                          ? `${v.discountValue}%`
                          : formatCurrency(v.discountValue)}
                        <p className="text-xs text-gray-500">{VOUCHER_DISCOUNT_TYPE_LABELS[v.discountType]}</p>
                        {v.maxDiscountAmount ? <p className="text-xs text-gray-500">Tối đa {formatCurrency(v.maxDiscountAmount)}</p> : null}
                      </td>
                      <td className="px-2 py-2">
                        {v.minOrderAmount ? <p>Từ {formatCurrency(v.minOrderAmount)}</p> : <p>Không</p>}
                        {(v.validFrom || v.validTo) && (
                          <p className="text-xs text-gray-500 mt-1">
                            {v.validFrom ? new Date(v.validFrom).toLocaleString('vi-VN') : 'Ngay'}
                            {' - '}
                            {v.validTo ? new Date(v.validTo).toLocaleString('vi-VN') : 'Không giới hạn'}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {v.active ? 'Hoạt động' : 'Tạm dừng'}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        {(v.usedCount || 0).toLocaleString('vi-VN')}
                        {v.usageLimit ? ` / ${v.usageLimit.toLocaleString('vi-VN')}` : ''}
                      </td>
                      {canEdit && (
                        <td className="px-2 py-2">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openVoucherEdit(v)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded"><Edit2 size={16} /></button>
                            <button onClick={() => deleteVoucher(v.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'loyalty' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Quản lý tích điểm theo SĐT</h3>
              <p className="text-xs text-gray-500">Nhập số điện thoại để tra cứu hoặc tạo hồ sơ tích điểm cho khách hàng</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={loyaltyPhone}
                  onChange={(e) => setLoyaltyPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      lookupLoyaltyAccount();
                    }
                  }}
                  placeholder="Ví dụ: 09xxxxxxxx"
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button
                type="button"
                onClick={lookupLoyaltyAccount}
                disabled={loadingLoyalty}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Search size={16} /> {loadingLoyalty ? 'Đang tra...' : 'Tra cứu'}
              </button>
            </div>
            {loyaltyError && <p className="mt-2 text-xs text-red-600">{loyaltyError}</p>}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">SĐT khách đã mua</h3>
              </div>
              <button
                type="button"
                onClick={loadLoyaltyAccounts}
                disabled={loadingLoyaltyAccounts}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-60"
              >
                <RefreshCw size={16} className={loadingLoyaltyAccounts ? 'animate-spin' : ''} />
                Làm mới
              </button>
            </div>

            {loadingLoyaltyAccounts ? (
              <p className="text-sm text-gray-500">Đang tải danh sách khách...</p>
            ) : loyaltyAccounts.length === 0 ? (
              <p className="text-sm text-gray-400">Chưa có khách nào được tích điểm. Điểm chỉ được cộng khi đơn chuyển sang Hoàn thành.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-2 py-2">SĐT</th>
                      <th className="px-2 py-2">Điểm hiện có</th>
                      <th className="px-2 py-2">Tổng đơn</th>
                      <th className="px-2 py-2">Tổng chi tiêu</th>
                      <th className="px-2 py-2">Lần mua gần nhất</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loyaltyAccounts.map((account) => (
                      <tr
                        key={account.id}
                        onClick={() => {
                          setLoyaltyPhone(account.phone);
                          setLoyaltyAccount(account);
                          setLoyaltyError('');
                        }}
                        className="cursor-pointer border-b border-gray-100 hover:bg-blue-50"
                      >
                        <td className="px-2 py-2 font-semibold text-blue-700">{account.phone}</td>
                        <td className="px-2 py-2 font-medium text-amber-700">{account.pointsBalance.toLocaleString('vi-VN')}</td>
                        <td className="px-2 py-2">{account.totalOrders.toLocaleString('vi-VN')}</td>
                        <td className="px-2 py-2">{formatCurrency(account.totalSpent)}</td>
                        <td className="px-2 py-2 text-gray-500">{formatDateTime(account.lastOrderAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {loyaltyAccount ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">SĐT</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{loyaltyAccount.phone}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Điểm hiện có</p>
                <p className="mt-2 text-2xl font-bold text-amber-800">{loyaltyAccount.pointsBalance.toLocaleString('vi-VN')}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Tổng đơn</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{loyaltyAccount.totalOrders.toLocaleString('vi-VN')}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Tổng chi tiêu</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{formatCurrency(loyaltyAccount.totalSpent)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 md:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Tổng điểm đã tích</p>
                <p className="mt-2 text-xl font-semibold text-gray-900">{loyaltyAccount.totalPointsEarned.toLocaleString('vi-VN')} điểm</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 md:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Lần mua gần nhất</p>
                <p className="mt-2 text-sm font-medium text-gray-900">{formatDateTime(loyaltyAccount.lastOrderAt)}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
              Chưa chọn khách hàng. Nhập SĐT để xem điểm tích lũy.
            </div>
          )}
        </div>
      )}

      {/* EVENT MODAL */}
      {showEventModal && (
        <EventModal
          isEditing={!!editingEvent}
          form={eventForm}
          onChange={setEventForm}
          onSave={saveEvent}
          onClose={() => setShowEventModal(false)}
        />
      )}

      {/* HOLIDAY MODAL */}
      {showHolidayModal && (
        <HolidayModal
          isEditing={!!editingHoliday}
          form={holidayForm}
          onChange={setHolidayForm}
          onSave={saveHoliday}
          onClose={() => setShowHolidayModal(false)}
        />
      )}

      {showVoucherModal && (
        <VoucherModal
          isEditing={!!editingVoucher}
          form={voucherForm}
          onChange={setVoucherForm}
          onSave={saveVoucher}
          onClose={() => setShowVoucherModal(false)}
        />
      )}
    </div>
  );
}
