import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Cloud, Plus, Edit2, Trash2,
  Calendar, MapPin, RefreshCw,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleKey } from '@/utils/helpers';
import { weatherService } from '@/services/weatherService';
import { eventService } from '@/services/eventService';
import { holidayService } from '@/services/holidayService';
import type {
  WeatherData, Event, EventForm, EventType, ImpactLevel,
  HolidayCalendar, HolidayCalendarForm, HolidayType,
} from '@/types';
import WeatherTab from '@/components/external/WeatherTab';
import EventModal from '@/components/external/EventModal';
import HolidayModal from '@/components/external/HolidayModal';

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  FESTIVAL: 'Lễ hội', HOLIDAY: 'Ngày nghỉ', CONCERT: 'Hòa nhạc',
  SPORT: 'Thể thao', PROMOTION: 'Khuyến mãi', CONFERENCE: 'Hội nghị', OTHER: 'Khác',
};
const EVENT_TYPE_COLORS: Record<EventType, string> = {
  FESTIVAL: 'bg-purple-100 text-purple-700', HOLIDAY: 'bg-red-100 text-red-700',
  CONCERT: 'bg-pink-100 text-pink-700', SPORT: 'bg-green-100 text-green-700',
  PROMOTION: 'bg-yellow-100 text-yellow-700', CONFERENCE: 'bg-[#FFE7CC] text-[#D48806]',
  OTHER: 'bg-[#F5E6D3] text-[#5D4037]',
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
  RELIGIOUS: 'bg-amber-100 text-amber-700', SCHOOL: 'bg-[#FFE7CC] text-[#D48806]',
  COMPANY: 'bg-teal-100 text-teal-700', OTHER: 'bg-[#F5E6D3] text-[#5D4037]',
};

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

type Tab = 'weather' | 'calendar';

const emptyEventForm: EventForm = {
  name: '', description: '', eventType: 'FESTIVAL', startDate: '', endDate: '',
  location: '', expectedImpact: 'MEDIUM', notes: '', active: true,
};
const emptyHolidayForm: HolidayCalendarForm = {
  name: '', holidayDate: '', holidayType: 'PUBLIC_HOLIDAY', recurring: false, description: '',
};

export default function ExternalFactorsPage() {
  const { user } = useAuth();
  const role = getRoleKey(user?.roleName);
  const canEdit = role === 'ADMIN' || role === 'MANAGER';

  const [tab, setTab] = useState<Tab>('calendar');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherRange, setWeatherRange] = useState<WeatherData[]>([]);
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

  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
    const load = async () => {
      setLoading(true);
      try {
        const res = await weatherService.getToday().catch(() => ({ data: { data: null } }));
        setWeather(res.data.data);
        const today = new Date();
        const from = toLocalDateStr(today);
        const to7 = new Date(today); to7.setDate(to7.getDate() + 6);
        const rangeRes = await weatherService.getRange(from, toLocalDateStr(to7)).catch(() => ({ data: { data: [] } }));
        setWeatherRange(rangeRes.data.data || []);
      } finally { setLoading(false); }
    };
    load();
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

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar, calRefresh]);

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
      expectedImpact: e.expectedImpact, notes: e.notes || '', active: e.active,
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
      recurring: h.recurring, description: h.description || '',
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

  const fetchWeatherNow = async () => {
    try {
      const res = await weatherService.fetchNow();
      setWeather(res.data.data);
      toast.success('Đã cập nhật thời tiết');
    } catch { toast.error('Lỗi cập nhật thời tiết'); }
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
      <div className="flex gap-1 bg-[#F5E6D3] rounded-lg p-1 w-fit">
        {([
          { key: 'weather' as Tab, label: 'Thời tiết', icon: Cloud },
          { key: 'calendar' as Tab, label: 'Lịch sự kiện & ngày lễ', icon: Calendar },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${tab === t.key ? 'bg-white text-[#D48806] shadow-sm' : 'text-[#6D4C41] hover:text-[#5D4037]'}`}
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
          canEdit={canEdit}
          onFetchNow={fetchWeatherNow}
        />
      )}

      {/* CALENDAR TAB */}
      {tab === 'calendar' && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 text-xs text-[#6D4C41]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Ngày lễ</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#FFF4E3]0 inline-block" /> Sự kiện</span>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <button onClick={syncHolidays} disabled={syncing}
                  className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                  <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngày lễ'}
                </button>
                <button onClick={openEventCreate} className="flex items-center gap-2 bg-[#F4A825] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#D48806]">
                  <Plus size={16} /> Sự kiện
                </button>
                <button onClick={openHolidayCreate} className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-purple-700">
                  <Plus size={16} /> Ngày lễ
                </button>
              </div>
            )}
          </div>

          {/* Calendar grid */}
          <div className="bg-white rounded-xl border border-[#E4CFB4] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4CFB4]">
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-1.5 hover:bg-[#F5E6D3] rounded-lg transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-lg font-semibold min-w-[180px] text-center">
                  Tháng {calMonth + 1}, {calYear}
                </h2>
                <button onClick={nextMonth} className="p-1.5 hover:bg-[#F5E6D3] rounded-lg transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>
              <button onClick={goToday} className="text-sm text-[#D48806] hover:bg-[#FFF4E3] px-3 py-1.5 rounded-lg transition-colors">
                Hôm nay
              </button>
            </div>
            <div className="grid grid-cols-7 border-b border-[#E4CFB4] bg-[#FDF6EC]">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-[#6D4C41]">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={i} className="min-h-[90px] bg-[#FDF6EC]/50 border-b border-r border-[#F1E4D6]" />;
                const dateStr = getDateStr(day);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const dayEvts = eventsForDate(dateStr);
                const dayHols = holidaysForDate(dateStr);
                return (
                  <div key={i} onClick={() => setSelectedDate(dateStr)}
                    className={`min-h-[90px] p-1.5 border-b border-r border-[#F1E4D6] cursor-pointer transition-colors
                      ${isSelected ? 'bg-[#FFF4E3] ring-2 ring-[#F4A825] ring-inset' : 'hover:bg-[#FDF6EC]'}
                      ${isToday && !isSelected ? 'bg-amber-50/50' : ''}`}>
                    <div className="mb-1">
                      <span className={`text-sm leading-none ${isToday
                        ? 'bg-[#F4A825] text-white w-6 h-6 rounded-full inline-flex items-center justify-center font-bold'
                        : 'text-[#5D4037] font-medium'}`}>{day}</span>
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayHols.slice(0, 2).map((h) => (
                        <div key={`h${h.id}`} className="text-[10px] leading-tight px-1 py-0.5 rounded bg-red-100 text-red-700 truncate">{h.name}</div>
                      ))}
                      {dayEvts.slice(0, 2).map((e) => (
                        <div key={`e${e.id}`} className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${EVENT_TYPE_COLORS[e.eventType]}`}>{e.name}</div>
                      ))}
                      {(dayHols.length + dayEvts.length) > 4 && (
                        <div className="text-[10px] text-[#A1887F] pl-1">+{dayHols.length + dayEvts.length - 4} khác</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected date detail */}
          {selectedDate && (
            <div className="bg-white rounded-xl border border-[#E4CFB4] p-5">
              <h3 className="font-semibold text-lg mb-4">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              {selectedHolidays.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-[#6D4C41] mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Ngày lễ ({selectedHolidays.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedHolidays.map((h) => (
                      <div key={h.id} className="flex items-center justify-between bg-red-50 rounded-lg p-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${HOLIDAY_TYPE_COLORS[h.holidayType]}`}>{HOLIDAY_TYPE_LABELS[h.holidayType]}</span>
                            {h.recurring && <span className="text-xs text-blue-500">🔄 Hàng năm</span>}
                          </div>
                          <p className="font-medium">{h.name}</p>
                          {h.description && <p className="text-sm text-[#6D4C41] mt-0.5">{h.description}</p>}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 ml-3 shrink-0">
                            <button onClick={() => openHolidayEdit(h)} className="p-1.5 text-[#A1887F] hover:text-[#D48806] hover:bg-[#FFE7CC] rounded"><Edit2 size={16} /></button>
                            <button onClick={() => deleteHoliday(h.id)} className="p-1.5 text-[#A1887F] hover:text-red-600 hover:bg-red-100 rounded"><Trash2 size={16} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedEvents.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-[#6D4C41] mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFF4E3]0 inline-block" /> Sự kiện ({selectedEvents.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedEvents.map((e) => (
                      <div key={e.id} className="flex items-center justify-between bg-[#FFF4E3] rounded-lg p-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_COLORS[e.eventType]}`}>{EVENT_TYPE_LABELS[e.eventType]}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${IMPACT_COLORS[e.expectedImpact]}`}>{IMPACT_LABELS[e.expectedImpact]}</span>
                            {e.active && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Hoạt động</span>}
                          </div>
                          <p className="font-medium">{e.name}</p>
                          <p className="text-sm text-[#6D4C41] mt-0.5">
                            {new Date(e.startDate).toLocaleDateString('vi-VN')} — {new Date(e.endDate).toLocaleDateString('vi-VN')}
                            {e.location && <> · <MapPin size={12} className="inline" /> {e.location}</>}
                          </p>
                          {e.description && <p className="text-sm text-[#A1887F] mt-0.5">{e.description}</p>}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 ml-3 shrink-0">
                            <button onClick={() => openEventEdit(e)} className="p-1.5 text-[#A1887F] hover:text-[#D48806] hover:bg-[#FFE7CC] rounded"><Edit2 size={16} /></button>
                            <button onClick={() => deleteEvent(e.id)} className="p-1.5 text-[#A1887F] hover:text-red-600 hover:bg-red-100 rounded"><Trash2 size={16} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedHolidays.length === 0 && selectedEvents.length === 0 && (
                <p className="text-[#A1887F] text-sm py-2">Không có sự kiện hoặc ngày lễ nào trong ngày này</p>
              )}
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
    </div>
  );
}


