import '@/styles/coffee-theme.css';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Download, LogIn, LogOut, Pencil, Plus, ReceiptText, RefreshCw, UserRoundCheck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { shiftService } from '@/services/shiftService';
import { userService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, getApiErrorMessage, getRoleKey } from '@/utils/helpers';
import type {
  ShiftAssignment,
  ShiftAssignmentUpdatePayload,
  ShiftAttendance,
  ShiftRevenueDetail,
  ShiftTemplate,
  ShiftTemplateForm,
  ShiftType,
  ShiftWorkSummary,
  User,
} from '@/types';

type AssignmentStatusFilter = 'ALL' | 'ASSIGNED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
  { value: 7, label: 'CN' },
];

const SHIFT_TYPE_OPTIONS: { value: ShiftType; label: string; description: string }[] = [
  { value: 'POS_COUNTER', label: 'Quầy POS', description: 'Ca cho nhân viên đứng quầy, thu ngân, xử lý bill' },
  { value: 'SERVICE_ORDER', label: 'Order & bưng bê', description: 'Ca cho nhân viên nhận order, phục vụ và bưng món' },
];

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  POS_COUNTER: 'Quầy POS',
  SERVICE_ORDER: 'Order & bưng bê',
};

const toDateInput = (date: Date) => date.toISOString().split('T')[0];

function formatDateTime(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('vi-VN');
}

function formatMinutes(value?: number) {
  if (value == null) return '—';
  const h = Math.floor(value / 60);
  const m = value % 60;
  if (h === 0) return `${m}p`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}p`;
}

function resolveShiftDateTime(item: ShiftAssignment, point: 'start' | 'end') {
  const scheduled = point === 'start' ? item.scheduledStartAt : item.scheduledEndAt;
  if (scheduled) {
    const d = new Date(scheduled);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const time = point === 'start' ? item.startTime : item.endTime;
  const d = new Date(`${item.shiftDate}T${time || '00:00'}:00`);
  if (point === 'end') {
    const start = new Date(`${item.shiftDate}T${item.startTime || '00:00'}:00`);
    if (!Number.isNaN(start.getTime()) && d <= start) {
      d.setDate(d.getDate() + 1);
    }
  }
  return d;
}

function getShiftDisplayState(item: ShiftAssignment) {
  if (item.status === 'CANCELLED') {
    return { label: 'Đã hủy', className: 'bg-[rgba(107,80,64,0.08)] text-[rgba(26,14,7,0.5)]', canCheckIn: false };
  }
  if (item.status === 'COMPLETED') {
    return { label: 'Đã kết ca', className: 'bg-emerald-100 text-emerald-700', canCheckIn: false };
  }
  if (item.status === 'CHECKED_IN') {
    return { label: 'Đang làm', className: 'bg-[rgba(201,162,122,0.18)] text-[#6b5040]', canCheckIn: false };
  }

  const now = new Date();
  const startAt = resolveShiftDateTime(item, 'start');
  const endAt = resolveShiftDateTime(item, 'end');
  const earliestCheckIn = new Date(startAt);
  earliestCheckIn.setHours(earliestCheckIn.getHours() - 3);

  if (now > endAt) {
    return { label: 'Đã quá ca - chưa vào ca', className: 'bg-rose-100 text-rose-700', canCheckIn: false };
  }
  if (now < earliestCheckIn) {
    return { label: 'Chưa tới giờ vào ca', className: 'bg-[rgba(107,80,64,0.07)] text-[rgba(26,14,7,0.55)]', canCheckIn: false };
  }
  return { label: 'Có thể vào ca', className: 'bg-amber-100 text-amber-700', canCheckIn: true };
}

export default function ShiftsPage() {
  const { user } = useAuth();
  const role = getRoleKey(user?.roleName);
  const isManager = role === 'ADMIN' || role === 'MANAGER';
  const currentUserId = user?.id;
  const [activeShiftType, setActiveShiftType] = useState<ShiftType>('POS_COUNTER');

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return toDateInput(d);
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return toDateInput(d);
  });

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [attendances, setAttendances] = useState<ShiftAttendance[]>([]);
  const [workSummary, setWorkSummary] = useState<ShiftWorkSummary[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<AssignmentStatusFilter>('ALL');

  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingBulkAssignment, setSavingBulkAssignment] = useState(false);
  const [savingEditAssignment, setSavingEditAssignment] = useState(false);
  const [savingEditTemplate, setSavingEditTemplate] = useState(false);
  const [processingAssignmentId, setProcessingAssignmentId] = useState<number | null>(null);
  const [exportingSummary, setExportingSummary] = useState(false);

  const [templateForm, setTemplateForm] = useState<ShiftTemplateForm>({
    name: '',
    startTime: '08:00',
    endTime: '16:00',
    breakMinutes: 30,
    shiftType: 'POS_COUNTER',
    active: true,
  });

  const [assignmentForm, setAssignmentForm] = useState({
    userId: 0,
    shiftTemplateId: 0,
    shiftDate: toDateInput(new Date()),
    note: '',
  });

  const [bulkWeekStart, setBulkWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diffToMonday);
    return toDateInput(d);
  });
  const [bulkWeekDays, setBulkWeekDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [bulkUserIds, setBulkUserIds] = useState<number[]>([]);
  const [bulkTemplateId, setBulkTemplateId] = useState(0);
  const [bulkNote, setBulkNote] = useState('');

  const [editingAssignment, setEditingAssignment] = useState<ShiftAssignment | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [selectedRevenueSummary, setSelectedRevenueSummary] = useState<ShiftWorkSummary | null>(null);
  const [revenueDetails, setRevenueDetails] = useState<ShiftRevenueDetail[]>([]);
  const [loadingRevenueDetails, setLoadingRevenueDetails] = useState(false);
  const [editForm, setEditForm] = useState({
    userId: 0,
    shiftTemplateId: 0,
    shiftDate: '',
    shiftType: 'POS_COUNTER' as ShiftType,
    status: 'ASSIGNED' as 'ASSIGNED' | 'CANCELLED',
    note: '',
  });
  const [editTemplateForm, setEditTemplateForm] = useState<ShiftTemplateForm>({
    name: '',
    startTime: '08:00',
    endTime: '16:00',
    breakMinutes: 30,
    active: true,
  });

  const normalizeTimeInput = useCallback((value: string | undefined) => {
    if (!value) return '08:00';
    return value.length >= 5 ? value.slice(0, 5) : value;
  }, []);

  const loadTemplates = useCallback(async () => {
    if (!isManager) return;
    const res = await shiftService.getTemplates(false);
    const data = res.data.data || [];
    const activeData = data.filter((item) => item.active);
    setTemplates(data);
    setAssignmentForm((prev) => ({
      ...prev,
      shiftTemplateId: activeData.some((item) => item.id === prev.shiftTemplateId)
        ? prev.shiftTemplateId
        : activeData[0]?.id || 0,
    }));
    setBulkTemplateId((prev) => activeData.some((item) => item.id === prev) ? prev : activeData[0]?.id || 0);
  }, [isManager]);

  const loadUsers = useCallback(async () => {
    if (!isManager) return;
    const res = await userService.getAll(0, 300);
    const users = (res.data.data.content || []).filter((u) => {
      const roleKey = getRoleKey(u.roleName);
      return roleKey === 'STAFF' || roleKey === 'MANAGER';
    });
    setStaffUsers(users);
    setAssignmentForm((prev) => ({
      ...prev,
      userId: prev.userId || users[0]?.id || 0,
    }));
    setBulkUserIds((prev) => (prev.length > 0 ? prev : users.slice(0, 1).map((u) => u.id)));
  }, [isManager]);

  const loadAssignments = useCallback(async () => {
    if (isManager) {
      const res = await shiftService.getAssignments({
        fromDate,
        toDate,
        userId: selectedUserId === '' ? undefined : Number(selectedUserId),
        shiftType: activeShiftType,
      });
      setAssignments(res.data.data || []);
      return;
    }

    const res = await shiftService.getMyAssignments({ fromDate, toDate });
    setAssignments(res.data.data || []);
  }, [activeShiftType, fromDate, isManager, selectedUserId, toDate]);

  const loadAttendances = useCallback(async () => {
    if (isManager) {
      const res = await shiftService.getAttendances({
        fromDate,
        toDate,
        userId: selectedUserId === '' ? undefined : Number(selectedUserId),
        shiftType: activeShiftType,
      });
      setAttendances(res.data.data || []);
      return;
    }

    const res = await shiftService.getMyAttendances({ fromDate, toDate });
    setAttendances(res.data.data || []);
  }, [activeShiftType, fromDate, isManager, selectedUserId, toDate]);

  const loadWorkSummary = useCallback(async () => {
    if (!isManager) {
      setWorkSummary([]);
      return;
    }
    const res = await shiftService.getWorkSummary({
      fromDate,
      toDate,
      userId: selectedUserId === '' ? undefined : Number(selectedUserId),
      shiftType: activeShiftType,
    });
    setWorkSummary(res.data.data || []);
  }, [activeShiftType, fromDate, isManager, selectedUserId, toDate]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTemplates(),
        loadUsers(),
        loadAssignments(),
        loadAttendances(),
        loadWorkSummary(),
      ]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không tải được dữ liệu ca làm'));
    } finally {
      setLoading(false);
    }
  }, [loadAssignments, loadAttendances, loadTemplates, loadUsers, loadWorkSummary]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const filteredAssignments = useMemo(() => {
    const byShiftType = assignments.filter((item) => (item.shiftType || 'POS_COUNTER') === activeShiftType);
    if (statusFilter === 'ALL') return byShiftType;
    return byShiftType.filter((item) => item.status === statusFilter);
  }, [activeShiftType, assignments, statusFilter]);

  const filteredAttendances = useMemo(
    () => attendances.filter((item) => (item.shiftType || 'POS_COUNTER') === activeShiftType),
    [activeShiftType, attendances],
  );

  const activeTemplates = useMemo(() => templates.filter((item) => item.active), [templates]);
  const inactiveTemplates = useMemo(() => templates.filter((item) => !item.active), [templates]);

  const myPendingAssignment = useMemo(
    () => assignments.find((item) => item.userId === currentUserId && item.status === 'ASSIGNED'),
    [assignments, currentUserId],
  );

  const myCheckedInAssignment = useMemo(
    () => assignments.find((item) => item.userId === currentUserId && item.status === 'CHECKED_IN'),
    [assignments, currentUserId],
  );

  const summaryTotals = useMemo(() => {
    const totals = workSummary.reduce(
      (acc, row) => {
        acc.totalAssignments += row.totalAssignments || 0;
        acc.completedCount += row.completedCount || 0;
        acc.absentCount += row.absentCount || 0;
        acc.totalWorkedMinutes += row.totalWorkedMinutes || 0;
        acc.totalLateMinutes += row.totalLateMinutes || 0;
        acc.totalEarlyLeaveMinutes += row.totalEarlyLeaveMinutes || 0;
        acc.totalRevenueDuringShift += row.totalRevenueDuringShift || 0;
        acc.totalCashierRevenueDuringShift += row.totalCashierRevenueDuringShift || 0;
        return acc;
      },
      {
        totalAssignments: 0,
        completedCount: 0,
        absentCount: 0,
        totalWorkedMinutes: 0,
        totalLateMinutes: 0,
        totalEarlyLeaveMinutes: 0,
        totalRevenueDuringShift: 0,
        totalCashierRevenueDuringShift: 0,
        averageRevenuePerCompletedShift: 0,
      },
    );

    totals.averageRevenuePerCompletedShift = totals.completedCount > 0
      ? totals.totalRevenueDuringShift / totals.completedCount
      : 0;

    return totals;
  }, [workSummary]);

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast.error('Tên ca không được để trống');
      return;
    }
    setSavingTemplate(true);
    try {
      await shiftService.createTemplate(templateForm);
      toast.success('Đã tạo mẫu ca');
      setTemplateForm({ name: '', startTime: '08:00', endTime: '16:00', breakMinutes: 30, active: true });
      await refreshAll();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không tạo được mẫu ca'));
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeactivateTemplate = async (templateId: number) => {
    if (!confirm('Ngừng sử dụng mẫu ca này?')) return;
    try {
      await shiftService.deactivateTemplate(templateId);
      toast.success('Đã ngừng sử dụng mẫu ca');
      await refreshAll();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể ngừng mẫu ca'));
    }
  };

  const openEditTemplate = (template: ShiftTemplate) => {
    setEditingTemplate(template);
    setEditTemplateForm({
      name: template.name,
      startTime: normalizeTimeInput(template.startTime),
      endTime: normalizeTimeInput(template.endTime),
      breakMinutes: template.breakMinutes ?? 0,
      active: template.active,
    });
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    if (!editTemplateForm.name.trim()) {
      toast.error('Tên ca không được để trống');
      return;
    }

    setSavingEditTemplate(true);
    try {
      await shiftService.updateTemplate(editingTemplate.id, {
        name: editTemplateForm.name.trim(),
        startTime: editTemplateForm.startTime,
        endTime: editTemplateForm.endTime,
        breakMinutes: Number(editTemplateForm.breakMinutes) || 0,
        active: editTemplateForm.active ?? true,
      });
      toast.success('Đã cập nhật mẫu ca');
      setEditingTemplate(null);
      await refreshAll();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không cập nhật được mẫu ca'));
    } finally {
      setSavingEditTemplate(false);
    }
  };

  const handleRestoreTemplate = async (template: ShiftTemplate) => {
    try {
      await shiftService.updateTemplate(template.id, {
        name: template.name,
        startTime: normalizeTimeInput(template.startTime),
        endTime: normalizeTimeInput(template.endTime),
        breakMinutes: template.breakMinutes ?? 0,
        active: true,
      });
      toast.success('Đã khôi phục mẫu ca');
      await refreshAll();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không khôi phục được mẫu ca'));
    }
  };

  const handleCreateAssignment = async () => {
    if (!assignmentForm.userId || !assignmentForm.shiftTemplateId || !assignmentForm.shiftDate) {
      toast.error('Vui lòng nhập đủ thông tin phân ca');
      return;
    }
    setSavingAssignment(true);
    try {
      await shiftService.createAssignment({
        userId: assignmentForm.userId,
        shiftTemplateId: assignmentForm.shiftTemplateId,
        shiftDate: assignmentForm.shiftDate,
        shiftType: activeShiftType,
        note: assignmentForm.note || undefined,
      });
      toast.success('Đã phân ca thành công');
      setAssignmentForm((prev) => ({ ...prev, note: '' }));
      await refreshAll();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không phân ca được'));
    } finally {
      setSavingAssignment(false);
    }
  };

  const toggleBulkUser = (userId: number) => {
    setBulkUserIds((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      return [...prev, userId];
    });
  };

  const toggleBulkWeekDay = (day: number) => {
    setBulkWeekDays((prev) => {
      if (prev.includes(day)) return prev.filter((v) => v !== day);
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const handleBulkAssign = async () => {
    if (!bulkTemplateId) {
      toast.error('Vui lòng chọn mẫu ca');
      return;
    }
    if (bulkUserIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 nhân viên');
      return;
    }
    if (bulkWeekDays.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 ngày trong tuần');
      return;
    }

    const weekStartDate = new Date(`${bulkWeekStart}T00:00:00`);
    if (Number.isNaN(weekStartDate.getTime())) {
      toast.error('Tuần bắt đầu không hợp lệ');
      return;
    }

    const shiftDates = bulkWeekDays
      .slice()
      .sort((a, b) => a - b)
      .map((day) => {
        const d = new Date(weekStartDate);
        d.setDate(weekStartDate.getDate() + day - 1);
        return toDateInput(d);
      });

    setSavingBulkAssignment(true);
    try {
      await shiftService.createAssignmentsBulk({
        shiftTemplateId: bulkTemplateId,
        userIds: bulkUserIds,
        shiftDates,
        shiftType: activeShiftType,
        note: bulkNote || undefined,
      });
      toast.success('Đã phân ca theo tuần');
      setBulkNote('');
      await refreshAll();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không phân ca theo tuần được'));
    } finally {
      setSavingBulkAssignment(false);
    }
  };

  const openEditAssignment = (assignment: ShiftAssignment) => {
    setEditingAssignment(assignment);
    setEditForm({
      userId: assignment.userId,
      shiftTemplateId: assignment.shiftTemplateId,
      shiftDate: assignment.shiftDate,
      shiftType: assignment.shiftType || activeShiftType,
      status: assignment.status === 'CANCELLED' ? 'CANCELLED' : 'ASSIGNED',
      note: assignment.note || '',
    });
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return;
    if (!editForm.userId || !editForm.shiftTemplateId || !editForm.shiftDate) {
      toast.error('Vui lòng nhập đủ dữ liệu');
      return;
    }

    const payload: ShiftAssignmentUpdatePayload = {};
    if (editForm.userId !== editingAssignment.userId) {
      payload.userId = editForm.userId;
    }
    if (editForm.shiftTemplateId !== editingAssignment.shiftTemplateId) {
      payload.shiftTemplateId = editForm.shiftTemplateId;
    }
    if (editForm.shiftDate !== editingAssignment.shiftDate) {
      payload.shiftDate = editForm.shiftDate;
    }
    if (editForm.shiftType !== (editingAssignment.shiftType || 'POS_COUNTER')) {
      payload.shiftType = editForm.shiftType;
    }

    const currentStatus = editingAssignment.status === 'CANCELLED' ? 'CANCELLED' : 'ASSIGNED';
    if (editForm.status !== currentStatus) {
      payload.status = editForm.status;
    }

    const nextNote = editForm.note.trim();
    const oldNote = (editingAssignment.note ?? '').trim();
    if (nextNote !== oldNote) {
      payload.note = nextNote || undefined;
    }

    if (Object.keys(payload).length === 0) {
      toast('Không có thay đổi để lưu', { icon: 'ℹ️' });
      return;
    }

    setSavingEditAssignment(true);
    try {
      await shiftService.updateAssignment(editingAssignment.id, payload);
      toast.success('Đã cập nhật ca');
      setEditingAssignment(null);
      await refreshAll();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không cập nhật ca được'));
    } finally {
      setSavingEditAssignment(false);
    }
  };

  const handleCheckIn = async (assignmentId: number) => {
    setProcessingAssignmentId(assignmentId);
    try {
      await shiftService.checkIn({ assignmentId, source: 'WEB' });
      toast.success('Check-in thành công');
      await refreshAll();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Check-in thất bại'));
    } finally {
      setProcessingAssignmentId(null);
    }
  };

  const handleCheckOut = async (assignmentId: number) => {
    setProcessingAssignmentId(assignmentId);
    try {
      await shiftService.checkOut({ assignmentId, source: 'WEB' });
      toast.success('Check-out thành công');
      await refreshAll();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Check-out thất bại'));
    } finally {
      setProcessingAssignmentId(null);
    }
  };

  const handleCancel = async (assignmentId: number) => {
    if (!confirm('Bạn có chắc muốn hủy ca này?')) return;
    setProcessingAssignmentId(assignmentId);
    try {
      await shiftService.cancelAssignment(assignmentId);
      toast.success('Đã hủy ca');
      await refreshAll();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không hủy được ca'));
    } finally {
      setProcessingAssignmentId(null);
    }
  };

  const handleExportWorkSummary = async () => {
    setExportingSummary(true);
    try {
      const res = await shiftService.exportWorkSummaryCsv({
        fromDate,
        toDate,
        userId: selectedUserId === '' ? undefined : Number(selectedUserId),
        shiftType: activeShiftType,
      });

      const contentDisposition = (res.headers?.['content-disposition'] ?? '') as string;
      const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
      const fileName = fileNameMatch?.[1] || `shift_work_summary_${fromDate}_${toDate}.csv`;

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Đã xuất báo cáo giờ công');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể xuất CSV giờ công'));
    } finally {
      setExportingSummary(false);
    }
  };

  const openRevenueDetails = async (row: ShiftWorkSummary) => {
    if ((row.shiftType || activeShiftType) !== 'POS_COUNTER') {
      return;
    }
    setSelectedRevenueSummary(row);
    setRevenueDetails([]);
    setLoadingRevenueDetails(true);
    try {
      const res = await shiftService.getRevenueDetails({
        fromDate,
        toDate,
        userId: row.userId,
        shiftType: row.shiftType || activeShiftType,
      });
      setRevenueDetails(res.data.data || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không tải được chi tiết doanh thu ca'));
    } finally {
      setLoadingRevenueDetails(false);
    }
  };

  const showRevenueColumns = activeShiftType === 'POS_COUNTER';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a0e07] flex items-center gap-2">
            <CalendarClock size={24} className="text-[#c9a27a]" /> Quản lý ca làm
          </h1>
          <p className="text-sm text-[rgba(26,14,7,0.45)] mt-1">Tách lịch ca cho quầy POS và nhân viên order/bưng bê.</p>
        </div>
        <button
          onClick={refreshAll}
          className="inline-flex items-center gap-2 rounded-xl border border-[rgba(107,80,64,0.2)] px-4 py-2 text-sm font-medium text-[rgba(26,14,7,0.7)] hover:bg-[rgba(107,80,64,0.06)] transition-colors"
        >
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {SHIFT_TYPE_OPTIONS.map((option) => {
          const active = activeShiftType === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveShiftType(option.value)}
              className={`rounded-xl border p-4 text-left transition-all ${active ? 'border-[#c9a27a] bg-[rgba(201,162,122,0.08)] shadow-sm' : 'border-[rgba(107,80,64,0.12)] bg-white hover:border-[#c9a27a] hover:bg-[rgba(253,247,240,0.5)]'}`}
            >
              <div className={`text-sm font-semibold ${active ? 'text-[#6b5040]' : 'text-[#1a0e07]'}`}>{option.label}</div>
              <p className="mt-1 text-sm text-[rgba(26,14,7,0.45)]">{option.description}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-[rgba(107,80,64,0.12)] rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3 shadow-[0_2px_12px_-4px_rgba(26,14,7,0.06)]">
        <div>
          <label className="block text-xs font-medium text-[rgba(26,14,7,0.45)] mb-1">Từ ngày</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm outline-none focus:border-[#c9a27a] focus:ring-2 focus:ring-[rgba(201,162,122,0.12)] transition" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[rgba(26,14,7,0.45)] mb-1">Đến ngày</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm outline-none focus:border-[#c9a27a] focus:ring-2 focus:ring-[rgba(201,162,122,0.12)] transition" />
        </div>
        {isManager && (
          <>
            <div>
              <label className="block text-xs font-medium text-[rgba(26,14,7,0.45)] mb-1">Nhân viên</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm outline-none focus:border-[#c9a27a] transition"
              >
                <option value="">Tất cả</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgba(26,14,7,0.45)] mb-1">Trạng thái ca</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AssignmentStatusFilter)}
                className="w-full rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm outline-none focus:border-[#c9a27a] transition"
              >
                <option value="ALL">Tất cả</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="CHECKED_IN">CHECKED_IN</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </>
        )}
        {!isManager && (
          <div className="md:col-span-3 flex items-end text-sm text-[rgba(26,14,7,0.45)]">
            Tài khoản nhân viên chỉ xem ca/chấm công của chính mình.
          </div>
        )}
      </div>

      {(myPendingAssignment || myCheckedInAssignment) && (
        <div className="bg-[rgba(201,162,122,0.1)] border border-[rgba(201,162,122,0.3)] rounded-xl p-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="text-sm text-[#7a5c3e]">
            {myCheckedInAssignment
              ? `Bạn đang trong ca ${myCheckedInAssignment.shiftTemplateName} (${myCheckedInAssignment.shiftDate})`
              : `Bạn có ${myPendingAssignment?.shiftTemplateName} cần check-in`}
          </div>
          <div className="flex gap-2">
            {myPendingAssignment && (
              <button
                onClick={() => handleCheckIn(myPendingAssignment.id)}
                disabled={processingAssignmentId === myPendingAssignment.id}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-3 py-2 text-sm font-medium hover:brightness-110 disabled:opacity-60 transition-all"
              >
                <LogIn size={16} /> Check-in
              </button>
            )}
            {myCheckedInAssignment && (
              <button
                onClick={() => handleCheckOut(myCheckedInAssignment.id)}
                disabled={processingAssignmentId === myCheckedInAssignment.id}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 text-white px-3 py-2 text-sm font-medium hover:brightness-110 disabled:opacity-60 transition-all"
              >
                <LogOut size={16} /> Check-out
              </button>
            )}
          </div>
        </div>
      )}

      {isManager && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="bg-white border border-[rgba(107,80,64,0.12)] rounded-xl p-4 space-y-3 shadow-[0_2px_12px_-4px_rgba(26,14,7,0.06)]">
            <h2 className="font-semibold text-[#1a0e07]">Mẫu ca dùng chung</h2>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={templateForm.name}
                onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Tên ca (VD: Ca sáng)"
                className="col-span-2 rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm outline-none focus:border-[#c9a27a] focus:ring-2 focus:ring-[rgba(201,162,122,0.12)] transition"
              />
              <input type="time" value={templateForm.startTime} onChange={(e) => setTemplateForm((p) => ({ ...p, startTime: e.target.value }))} className="rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm outline-none focus:border-[#c9a27a] transition" />
              <input type="time" value={templateForm.endTime} onChange={(e) => setTemplateForm((p) => ({ ...p, endTime: e.target.value }))} className="rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm outline-none focus:border-[#c9a27a] transition" />
              <input type="number" min={0} max={240} value={templateForm.breakMinutes} onChange={(e) => setTemplateForm((p) => ({ ...p, breakMinutes: Number(e.target.value) || 0 }))} placeholder="Phút nghỉ" className="rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm outline-none focus:border-[#c9a27a] transition" />
              <button onClick={handleCreateTemplate} disabled={savingTemplate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6b5040] text-white px-3 py-2 text-sm font-medium hover:brightness-110 disabled:opacity-60 transition-all">
                <Plus size={16} /> {savingTemplate ? 'Đang tạo...' : 'Tạo mẫu'}
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {activeTemplates.map((template) => (
                <div key={template.id} className="border border-[rgba(107,80,64,0.12)] rounded-xl px-3 py-2 flex items-center justify-between gap-3 bg-white">
                  <div>
                    <div className="text-sm font-medium text-[#1a0e07]">{template.name}</div>
                    <div className="text-xs text-[rgba(26,14,7,0.45)]">{template.startTime} - {template.endTime} • nghỉ {template.breakMinutes}p</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditTemplate(template)} className="text-xs px-2.5 py-1.5 rounded-lg border border-[rgba(107,80,64,0.2)] text-[#6b5040] hover:bg-[rgba(107,80,64,0.06)] transition-colors">
                      Sửa
                    </button>
                    <button onClick={() => handleDeactivateTemplate(template.id)} className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                      Ngừng dùng
                    </button>
                  </div>
                </div>
              ))}
              {activeTemplates.length === 0 && <div className="text-sm text-[rgba(26,14,7,0.4)]">Không có mẫu ca đang dùng.</div>}

              {inactiveTemplates.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-semibold text-[rgba(26,14,7,0.4)] uppercase tracking-wide mb-2">Mẫu ca đã ngừng dùng</div>
                  <div className="space-y-2">
                    {inactiveTemplates.map((template) => (
                      <div key={template.id} className="border border-[rgba(107,80,64,0.1)] rounded-xl px-3 py-2 flex items-center justify-between gap-3 bg-[rgba(253,247,240,0.5)]">
                        <div>
                          <div className="text-sm font-medium text-[rgba(26,14,7,0.6)]">{template.name}</div>
                          <div className="text-xs text-[rgba(26,14,7,0.35)]">{template.startTime} - {template.endTime} • nghỉ {template.breakMinutes}p</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditTemplate(template)} className="text-xs px-2.5 py-1.5 rounded-lg border border-[rgba(107,80,64,0.2)] text-[#6b5040] hover:bg-[rgba(107,80,64,0.06)] transition-colors">
                            Sửa
                          </button>
                          <button onClick={() => handleRestoreTemplate(template)} className="text-xs px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors">
                            Khôi phục
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-[rgba(107,80,64,0.12)] rounded-xl p-4 space-y-3 shadow-[0_2px_12px_-4px_rgba(26,14,7,0.06)]">
            <h2 className="font-semibold text-[#1a0e07]">Phân ca nhanh - {SHIFT_TYPE_LABELS[activeShiftType]}</h2>
            <div className="grid grid-cols-2 gap-3">
              <select value={assignmentForm.userId} onChange={(e) => setAssignmentForm((p) => ({ ...p, userId: Number(e.target.value) }))} className="col-span-2 rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm outline-none focus:border-[#c9a27a] transition">
                {staffUsers.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
              <select value={assignmentForm.shiftTemplateId} onChange={(e) => setAssignmentForm((p) => ({ ...p, shiftTemplateId: Number(e.target.value) }))} className="rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm outline-none focus:border-[#c9a27a] transition">
                {activeTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                {activeTemplates.length === 0 && <option value={0}>Không có mẫu ca active</option>}
              </select>
              <input type="date" value={assignmentForm.shiftDate} onChange={(e) => setAssignmentForm((p) => ({ ...p, shiftDate: e.target.value }))} className="rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm outline-none focus:border-[#c9a27a] transition" />
              <input value={assignmentForm.note} onChange={(e) => setAssignmentForm((p) => ({ ...p, note: e.target.value }))} placeholder="Ghi chú" className="col-span-2 rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm outline-none focus:border-[#c9a27a] transition" />
              <button onClick={handleCreateAssignment} disabled={savingAssignment || activeTemplates.length === 0} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#6b5040] text-white px-3 py-2 text-sm font-medium hover:brightness-110 disabled:opacity-60 transition-all">
                <Plus size={16} /> {savingAssignment ? 'Đang lưu...' : 'Phân ca'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-[rgba(107,80,64,0.12)] rounded-xl p-4 space-y-3 shadow-[0_2px_12px_-4px_rgba(26,14,7,0.06)]">
            <h2 className="font-semibold text-[#1a0e07]">Phân ca theo tuần - {SHIFT_TYPE_LABELS[activeShiftType]}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[rgba(26,14,7,0.45)] mb-1">Tuần bắt đầu (Thứ 2)</label>
                <input type="date" value={bulkWeekStart} onChange={(e) => setBulkWeekStart(e.target.value)} className="w-full rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm outline-none focus:border-[#c9a27a] transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[rgba(26,14,7,0.45)] mb-1">Mẫu ca</label>
                <select value={bulkTemplateId} onChange={(e) => setBulkTemplateId(Number(e.target.value))} className="w-full rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm outline-none focus:border-[#c9a27a] transition">
                  {activeTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  {activeTemplates.length === 0 && <option value={0}>Không có mẫu ca active</option>}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[rgba(26,14,7,0.45)] mb-1">Chọn ngày trong tuần</label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((opt) => {
                    const active = bulkWeekDays.includes(opt.value);
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => toggleBulkWeekDay(opt.value)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${active ? 'bg-[#6b5040] border-[#6b5040] text-white' : 'border-[rgba(107,80,64,0.18)] text-[rgba(26,14,7,0.6)] hover:bg-[rgba(107,80,64,0.06)]'}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[rgba(26,14,7,0.45)] mb-1">Chọn nhân viên</label>
                <div className="max-h-32 overflow-y-auto border border-[rgba(107,80,64,0.15)] rounded-xl p-2 space-y-2">
                  {staffUsers.map((staff) => (
                    <label key={staff.id} className="flex items-center gap-2 text-sm text-[rgba(26,14,7,0.7)]">
                      <input type="checkbox" checked={bulkUserIds.includes(staff.id)} onChange={() => toggleBulkUser(staff.id)} className="rounded border-[rgba(107,80,64,0.3)]" />
                      <span>{staff.fullName}</span>
                    </label>
                  ))}
                </div>
              </div>
              <input value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} placeholder="Ghi chú chung" className="w-full rounded-xl border border-[rgba(107,80,64,0.15)] px-3 py-2 text-sm outline-none focus:border-[#c9a27a] transition" />
              <button onClick={handleBulkAssign} disabled={savingBulkAssignment || activeTemplates.length === 0} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#6b5040] text-white px-3 py-2 text-sm font-medium hover:brightness-110 disabled:opacity-60 transition-all">
                <UserRoundCheck size={16} /> {savingBulkAssignment ? 'Đang phân ca...' : 'Phân ca theo tuần'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-[rgba(107,80,64,0.12)] rounded-xl overflow-hidden shadow-[0_2px_12px_-4px_rgba(26,14,7,0.06)]">
        <div className="px-4 py-3 border-b border-[rgba(107,80,64,0.07)] font-semibold text-[#1a0e07]">Danh sách ca - {SHIFT_TYPE_LABELS[activeShiftType]}</div>
        {loading ? (
          <div className="p-8 text-center text-[rgba(26,14,7,0.4)]">Đang tải...</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-8 text-center text-[rgba(26,14,7,0.4)]">Chưa có dữ liệu ca theo bộ lọc hiện tại.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-[rgba(253,247,240,0.6)]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[rgba(26,14,7,0.45)] uppercase tracking-wide">Ngày</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[rgba(26,14,7,0.45)] uppercase tracking-wide">Ca</th>
                  {isManager && <th className="px-3 py-2 text-left text-xs font-semibold text-[rgba(26,14,7,0.45)] uppercase tracking-wide">Nhân viên</th>}
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[rgba(26,14,7,0.45)] uppercase tracking-wide">Trạng thái</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[rgba(26,14,7,0.45)] uppercase tracking-wide">Check-in</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[rgba(26,14,7,0.45)] uppercase tracking-wide">Check-out</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[rgba(26,14,7,0.45)] uppercase tracking-wide">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((item) => {
                  const isMine = item.userId === currentUserId;
                  const shiftState = getShiftDisplayState(item);
                  return (
                    <tr key={item.id} className="border-t border-[rgba(107,80,64,0.05)] hover:bg-[rgba(253,247,240,0.4)] transition-colors">
                      <td className="px-3 py-2 text-[rgba(26,14,7,0.7)]">{item.shiftDate}</td>
                      <td className="px-3 py-2 text-[rgba(26,14,7,0.7)]">{item.shiftTemplateName} ({item.startTime} - {item.endTime})</td>
                      {isManager && <td className="px-3 py-2 text-[rgba(26,14,7,0.7)]">{item.userFullName}</td>}
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${shiftState.className}`}>
                          {shiftState.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-[rgba(26,14,7,0.55)]">{formatDateTime(item.checkInAt)}</td>
                      <td className="px-3 py-2 text-xs text-[rgba(26,14,7,0.55)]">{formatDateTime(item.checkOutAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-2">
                          {isMine && item.status === 'ASSIGNED' && shiftState.canCheckIn && (
                            <button onClick={() => handleCheckIn(item.id)} disabled={processingAssignmentId === item.id} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-2.5 py-1.5 text-xs hover:brightness-110 disabled:opacity-60 transition-all">
                              <LogIn size={14} /> Vào ca
                            </button>
                          )}
                          {isMine && item.status === 'ASSIGNED' && !shiftState.canCheckIn && (
                            <span className="inline-flex items-center rounded-lg bg-[rgba(107,80,64,0.07)] px-2.5 py-1.5 text-xs text-[rgba(26,14,7,0.45)]">
                              {shiftState.label}
                            </span>
                          )}
                          {isMine && item.status === 'CHECKED_IN' && (
                            <button onClick={() => handleCheckOut(item.id)} disabled={processingAssignmentId === item.id} className="inline-flex items-center gap-1 rounded-lg bg-orange-600 text-white px-2.5 py-1.5 text-xs hover:brightness-110 disabled:opacity-60 transition-all">
                              <LogOut size={14} /> Kết ca
                            </button>
                          )}
                          {isManager && (
                            <button onClick={() => openEditAssignment(item)} className="inline-flex items-center gap-1 rounded-lg border border-[rgba(107,80,64,0.2)] text-[#6b5040] px-2.5 py-1.5 text-xs hover:bg-[rgba(107,80,64,0.06)] transition-colors">
                              <Pencil size={14} /> Sửa
                            </button>
                          )}
                          {isManager && item.status === 'ASSIGNED' && (
                            <button onClick={() => handleCancel(item.id)} disabled={processingAssignmentId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-red-200 text-red-600 px-2.5 py-1.5 text-xs hover:bg-red-50 disabled:opacity-60 transition-colors">
                              <XCircle size={14} /> Hủy
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold">Lịch sử chấm công - {SHIFT_TYPE_LABELS[activeShiftType]}</div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : filteredAttendances.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Chưa có dữ liệu chấm công.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Ngày</th>
                  <th className="px-3 py-2 text-left">Ca</th>
                  {isManager && <th className="px-3 py-2 text-left">Nhân viên</th>}
                  <th className="px-3 py-2 text-left">Vào ca</th>
                  <th className="px-3 py-2 text-left">Kết ca</th>
                  <th className="px-3 py-2 text-left">Phút công</th>
                  <th className="px-3 py-2 text-left">Đi trễ</th>
                  <th className="px-3 py-2 text-left">Về sớm</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendances.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{item.shiftDate}</td>
                    <td className="px-3 py-2">{item.shiftTemplateName}</td>
                    {isManager && <td className="px-3 py-2">{item.userFullName}</td>}
                    <td className="px-3 py-2">{formatDateTime(item.checkInAt)}</td>
                    <td className="px-3 py-2">{formatDateTime(item.checkOutAt)}</td>
                    <td className="px-3 py-2">{formatMinutes(item.workedMinutes)}</td>
                    <td className="px-3 py-2">{formatMinutes(item.lateMinutes)}</td>
                    <td className="px-3 py-2">{formatMinutes(item.earlyLeaveMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isManager && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
            <div className="font-semibold">Báo cáo giờ công theo nhân viên - {SHIFT_TYPE_LABELS[activeShiftType]}</div>
            <button
              onClick={handleExportWorkSummary}
              disabled={exportingSummary}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              <Download size={15} /> {exportingSummary ? 'Đang xuất...' : 'Xuất CSV'}
            </button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Đang tải...</div>
          ) : workSummary.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Không có dữ liệu tổng hợp trong khoảng thời gian đã chọn.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Nhân viên</th>
                    <th className="px-3 py-2 text-right">Tổng ca</th>
                    <th className="px-3 py-2 text-right">Hoàn thành</th>
                    <th className="px-3 py-2 text-right">Vắng</th>
                    <th className="px-3 py-2 text-right">Giờ công</th>
                    <th className="px-3 py-2 text-right">Đi trễ</th>
                    <th className="px-3 py-2 text-right">Về sớm</th>
                    {showRevenueColumns && (
                      <>
                        <th className="px-3 py-2 text-right">Doanh thu trong ca</th>
                        <th className="px-3 py-2 text-right">TB/ca hoàn thành</th>
                        <th className="px-3 py-2 text-right">Doanh thu thu ngân tự xử lý</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {workSummary.map((row) => (
                    <tr key={row.userId} className="border-t border-gray-100">
                      <td className="px-3 py-2">{row.userFullName}</td>
                      <td className="px-3 py-2 text-right">{row.totalAssignments ?? 0}</td>
                      <td className="px-3 py-2 text-right">{row.completedCount ?? 0}</td>
                      <td className="px-3 py-2 text-right">{row.absentCount ?? 0}</td>
                      <td className="px-3 py-2 text-right">{formatMinutes(row.totalWorkedMinutes)}</td>
                      <td className="px-3 py-2 text-right">{formatMinutes(row.totalLateMinutes)}</td>
                      <td className="px-3 py-2 text-right">{formatMinutes(row.totalEarlyLeaveMinutes)}</td>
                      {showRevenueColumns && (
                        <>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => openRevenueDetails(row)}
                              className="inline-flex items-center justify-end gap-1 rounded-lg px-2 py-1 font-medium text-[#6b5040] hover:bg-[rgba(107,80,64,0.06)] hover:text-[#4a3020] transition-colors"
                              title="Xem chi tiết doanh thu từng ca"
                            >
                              <ReceiptText size={14} />
                              {formatCurrency(row.totalRevenueDuringShift ?? 0)}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.averageRevenuePerCompletedShift ?? 0)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.totalCashierRevenueDuringShift ?? 0)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="border-t border-[rgba(107,80,64,0.1)] bg-[rgba(253,247,240,0.6)] font-semibold">
                    <td className="px-3 py-2">Tổng</td>
                    <td className="px-3 py-2 text-right">{summaryTotals.totalAssignments}</td>
                    <td className="px-3 py-2 text-right">{summaryTotals.completedCount}</td>
                    <td className="px-3 py-2 text-right">{summaryTotals.absentCount}</td>
                    <td className="px-3 py-2 text-right">{formatMinutes(summaryTotals.totalWorkedMinutes)}</td>
                    <td className="px-3 py-2 text-right">{formatMinutes(summaryTotals.totalLateMinutes)}</td>
                    <td className="px-3 py-2 text-right">{formatMinutes(summaryTotals.totalEarlyLeaveMinutes)}</td>
                    {showRevenueColumns && (
                      <>
                        <td className="px-3 py-2 text-right">{formatCurrency(summaryTotals.totalRevenueDuringShift)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(summaryTotals.averageRevenuePerCompletedShift)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(summaryTotals.totalCashierRevenueDuringShift)}</td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal
        open={Boolean(selectedRevenueSummary)}
        onClose={() => setSelectedRevenueSummary(null)}
        title={`Chi tiết doanh thu ca${selectedRevenueSummary ? ` - ${selectedRevenueSummary.userFullName}` : ''}`}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-4">
          {selectedRevenueSummary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[rgba(107,80,64,0.12)] p-3">
                <p className="text-xs text-[rgba(26,14,7,0.45)]">Nhóm ca</p>
                <p className="font-semibold text-[#1a0e07]">{SHIFT_TYPE_LABELS[selectedRevenueSummary.shiftType || activeShiftType]}</p>
              </div>
              <div className="rounded-xl border border-[rgba(201,162,122,0.3)] bg-[rgba(201,162,122,0.08)] p-3">
                <p className="text-xs text-[#7a5c3e]">Tổng doanh thu trong ca</p>
                <p className="font-semibold text-[#6b5040]">{formatCurrency(selectedRevenueSummary.totalRevenueDuringShift || 0)}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">Thu ngân tự xử lý</p>
                <p className="font-semibold text-emerald-800">{formatCurrency(selectedRevenueSummary.totalCashierRevenueDuringShift || 0)}</p>
              </div>
              <div className="rounded-xl border border-[rgba(107,80,64,0.12)] p-3">
                <p className="text-xs text-[rgba(26,14,7,0.45)]">Khoảng ngày</p>
                <p className="font-semibold text-[#1a0e07]">{fromDate} - {toDate}</p>
              </div>
            </div>
          )}

          {loadingRevenueDetails ? (
            <div className="py-10 text-center text-gray-500">Đang tải chi tiết...</div>
          ) : revenueDetails.length === 0 ? (
            <div className="py-10 text-center text-gray-500">Không có ca nào trong bộ lọc này.</div>
          ) : (
            <div className="overflow-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Ngày</th>
                    <th className="px-3 py-2 text-left">Ca</th>
                    <th className="px-3 py-2 text-left">Thời gian tính doanh thu</th>
                    <th className="px-3 py-2 text-right">Số đơn</th>
                    <th className="px-3 py-2 text-right">Doanh thu ca</th>
                    <th className="px-3 py-2 text-right">Thu ngân tự xử lý</th>
                    <th className="px-3 py-2 text-right">Giờ công</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueDetails.map((item) => {
                    const start = item.checkInAt || item.scheduledStartAt;
                    const end = item.checkOutAt || item.scheduledEndAt;
                    return (
                      <Fragment key={item.assignmentId}>
                        <tr key={item.assignmentId} className="border-t border-gray-100">
                          <td className="px-3 py-2">{item.shiftDate}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-800">{item.shiftTemplateName}</div>
                            <div className="text-xs text-gray-500">{item.status}</div>
                          </td>
                          <td className="px-3 py-2">
                            <div>{formatDateTime(start)}</div>
                            <div className="text-xs text-gray-500">đến {formatDateTime(end)}</div>
                          </td>
                          <td className="px-3 py-2 text-right">{item.transactionCount || 0}</td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-700">
                            {formatCurrency(item.totalRevenueDuringShift || 0)}
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-700">
                            {formatCurrency(item.totalCashierRevenueDuringShift || 0)}
                            <div className="text-xs text-gray-500">{item.cashierTransactionCount || 0} đơn</div>
                          </td>
                          <td className="px-3 py-2 text-right">{formatMinutes(item.workedMinutes)}</td>
                        </tr>
                        <tr className="border-t border-gray-100 bg-gray-50/60">
                          <td colSpan={7} className="px-3 py-3">
                            {(item.transactions || []).length === 0 ? (
                              <div className="text-xs text-gray-500">Ca này chưa có đơn thanh toán trong khoảng thời gian tính doanh thu.</div>
                            ) : (
                              <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
                                <table className="w-full text-xs">
                                  <thead className="bg-gray-50 text-gray-600">
                                    <tr>
                                      <th className="px-3 py-2 text-left">Đơn</th>
                                      <th className="px-3 py-2 text-left">Thanh toán</th>
                                      <th className="px-3 py-2 text-left">Thu ngân</th>
                                      <th className="px-3 py-2 text-left">Bàn/SĐT</th>
                                      <th className="px-3 py-2 text-left">Voucher</th>
                                      <th className="px-3 py-2 text-right">Giảm</th>
                                      <th className="px-3 py-2 text-right">Tổng</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(item.transactions || []).map((tx) => (
                                      <tr key={tx.salesTransactionId} className="border-t border-gray-100">
                                        <td className="px-3 py-2 font-medium text-gray-800">#{tx.orderId || tx.salesTransactionId}</td>
                                        <td className="px-3 py-2">
                                          <div>{formatDateTime(tx.paidAt)}</div>
                                          <div className="text-[11px] text-gray-500">{tx.paymentMethod || '—'}</div>
                                        </td>
                                        <td className="px-3 py-2">{tx.cashierName || '—'}</td>
                                        <td className="px-3 py-2">
                                          <div>{tx.tableNumber ? `${tx.tableNumber}` : 'POS'}</div>
                                          {tx.customerPhone && <div className="text-[11px] text-gray-500">{tx.customerPhone}</div>}
                                        </td>
                                        <td className="px-3 py-2">{tx.voucherCode || '—'}</td>
                                        <td className="px-3 py-2 text-right">{formatCurrency(tx.discountAmount || 0)}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-blue-700">{formatCurrency(tx.totalAmount || 0)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setSelectedRevenueSummary(null)}
              className="px-4 py-2 rounded-xl border border-[rgba(107,80,64,0.2)] text-sm text-[rgba(26,14,7,0.7)] hover:bg-[rgba(107,80,64,0.06)] transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(editingAssignment)}
        onClose={() => setEditingAssignment(null)}
        title="Chỉnh sửa ca làm"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Nhân viên</label>
              <select value={editForm.userId} onChange={(e) => setEditForm((p) => ({ ...p, userId: Number(e.target.value) }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {staffUsers.map((staff) => <option key={staff.id} value={staff.id}>{staff.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Mẫu ca</label>
              <select value={editForm.shiftTemplateId} onChange={(e) => setEditForm((p) => ({ ...p, shiftTemplateId: Number(e.target.value) }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}{template.active ? '' : ' (ngừng dùng)'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Ngày ca</label>
              <input type="date" value={editForm.shiftDate} onChange={(e) => setEditForm((p) => ({ ...p, shiftDate: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nhóm ca</label>
              <select
                value={editForm.shiftType}
                onChange={(e) => setEditForm((p) => ({ ...p, shiftType: e.target.value as ShiftType }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {SHIFT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Trạng thái</label>
              <select value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as 'ASSIGNED' | 'CANCELLED' }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Ghi chú</label>
              <input value={editForm.note} onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Ghi chú" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditingAssignment(null)} className="px-4 py-2 rounded-xl border border-[rgba(107,80,64,0.2)] text-sm text-[rgba(26,14,7,0.7)] hover:bg-[rgba(107,80,64,0.06)] transition-colors">Hủy</button>
            <button onClick={handleUpdateAssignment} disabled={savingEditAssignment} className="px-4 py-2 rounded-xl bg-[#6b5040] text-white text-sm font-medium hover:brightness-110 disabled:opacity-60 transition-all">
              {savingEditAssignment ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(editingTemplate)}
        onClose={() => setEditingTemplate(null)}
        title="Chỉnh sửa mẫu ca"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Tên ca</label>
              <input
                value={editTemplateForm.name}
                onChange={(e) => setEditTemplateForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Tên ca"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Bắt đầu</label>
              <input
                type="time"
                value={editTemplateForm.startTime}
                onChange={(e) => setEditTemplateForm((p) => ({ ...p, startTime: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Kết thúc</label>
              <input
                type="time"
                value={editTemplateForm.endTime}
                onChange={(e) => setEditTemplateForm((p) => ({ ...p, endTime: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Phút nghỉ</label>
              <input
                type="number"
                min={0}
                max={240}
                value={editTemplateForm.breakMinutes}
                onChange={(e) => setEditTemplateForm((p) => ({ ...p, breakMinutes: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(editTemplateForm.active)}
                  onChange={(e) => setEditTemplateForm((p) => ({ ...p, active: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                Đang sử dụng
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 rounded-xl border border-[rgba(107,80,64,0.2)] text-sm text-[rgba(26,14,7,0.7)] hover:bg-[rgba(107,80,64,0.06)] transition-colors">Hủy</button>
            <button onClick={handleUpdateTemplate} disabled={savingEditTemplate} className="px-4 py-2 rounded-xl bg-[#6b5040] text-white text-sm font-medium hover:brightness-110 disabled:opacity-60 transition-all">
              {savingEditTemplate ? 'Đang lưu...' : 'Lưu mẫu ca'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
