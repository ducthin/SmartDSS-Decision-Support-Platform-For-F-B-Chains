import '@/styles/coffee-theme.css';
import { useEffect, useState, useCallback } from 'react';
import { reportService } from '@/services/reportService';
import type {
  DailySalesReport,
  BestProduct,
  Inventory,
  TaxReportResponse,
  MlTrainingDataQuality,
  MlTrainingDataOutlierStats,
} from '@/types';
import { BarChart, Bar, AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, Calendar, Download } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const FIELD_LABELS: Record<string, string> = {
  date: 'Ngày',
  day_of_week: 'Thứ trong tuần',
  is_weekend: 'Cuối tuần',
  is_holiday: 'Ngày lễ',
  holiday_name: 'Tên ngày lễ',
  temperature: 'Nhiệt độ',
  rainfall: 'Lượng mưa',
  event_impact_level: 'Mức ảnh hưởng sự kiện',
  area_density_score: 'Điểm mật độ khu vực',
  sales_1_day_ago: 'Doanh thu T-1',
  sales_7_days_ago: 'Doanh thu T-7',
  revenue: 'Doanh thu',
  orders: 'Số đơn',
};

const EMPTY_QUALITY: MlTrainingDataQuality = {
  fromDate: '',
  toDate: '',
  expectedDays: 0,
  totalRows: 0,
  datasetCoverageRatePct: 0,
  missingCountByField: {},
  missingRatePctByField: {},
  outlierStatsByField: {},
  monthlyCoverage: [],
};

function formatWeeklyDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = DAY_NAMES[d.getDay()];
  return `${day} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function toLocalDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fieldLabel(field: string) {
  return FIELD_LABELS[field] || field;
}

function formatPct(value: number | undefined | null) {
  if (value == null || Number.isNaN(value)) return '0.00%';
  return `${Number(value).toFixed(2)}%`;
}

export default function ReportsPage() {
  const [tab, setTab] = useState<'daily' | 'weekly' | 'best' | 'low' | 'tax' | 'quality'>('daily');
  const [hourlyData, setHourlyData] = useState<DailySalesReport[]>([]);
  const [weeklyData, setWeeklyData] = useState<DailySalesReport[]>([]);
  const [bestProducts, setBestProducts] = useState<BestProduct[]>([]);
  const [lowStock, setLowStock] = useState<Inventory[]>([]);
  const [taxReport, setTaxReport] = useState<TaxReportResponse>({ summary: { date: '', totalOrders: 0, netAmount: 0, vatAmount: 0, totalAmount: 0 }, items: [] });
  const [trainingQuality, setTrainingQuality] = useState<MlTrainingDataQuality>(EMPTY_QUALITY);
  const [loading, setLoading] = useState(true);
  const [dailyDate, setDailyDate] = useState(() => toLocalDateInputValue(new Date()));
  const [weeklyDate, setWeeklyDate] = useState(() => toLocalDateInputValue(new Date()));
  const [taxFromDate, setTaxFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toLocalDateInputValue(d);
  });
  const [taxToDate, setTaxToDate] = useState(() => toLocalDateInputValue(new Date()));
  const [qualityFromDate, setQualityFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 365);
    return toLocalDateInputValue(d);
  });
  const [qualityToDate, setQualityToDate] = useState(() => toLocalDateInputValue(new Date()));

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      reportService.hourlySales(dailyDate).catch(() => ({ data: { data: [] } })),
      reportService.weeklySales(weeklyDate).catch(() => ({ data: { data: [] } })),
      reportService.bestProducts().catch(() => ({ data: { data: [] } })),
      reportService.lowStock().catch(() => ({ data: { data: [] } })),
      reportService.taxReport(taxFromDate, taxToDate).catch(() => ({
        data: { data: { summary: { date: '', totalOrders: 0, netAmount: 0, vatAmount: 0, totalAmount: 0 }, items: [] } },
      })),
      reportService.trainingDataQuality(qualityFromDate, qualityToDate).catch(() => ({
        data: { data: EMPTY_QUALITY },
      })),
    ]).then(([h, w, b, l, t, q]) => {
      setHourlyData(h.data.data || []);
      setWeeklyData((w.data.data || []).map((d: DailySalesReport) => ({ ...d, label: formatWeeklyDate(d.date) })));
      setBestProducts(b.data.data || []);
      setLowStock(l.data.data || []);
      setTaxReport(t.data.data || { summary: { date: '', totalOrders: 0, netAmount: 0, vatAmount: 0, totalAmount: 0 }, items: [] });
      setTrainingQuality(q.data.data || EMPTY_QUALITY);
    }).finally(() => setLoading(false));
  }, [dailyDate, weeklyDate, taxFromDate, taxToDate, qualityFromDate, qualityToDate]);

  useEffect(() => { loadData(); }, [loadData]);



  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  const tabs = [
    { key: 'daily', label: 'Doanh thu ngày' },
    { key: 'weekly', label: 'Doanh thu tuần' },
    { key: 'tax', label: 'Báo cáo thuế' },
    { key: 'best', label: 'Bán chạy nhất' },
    { key: 'low', label: 'Sắp hết hàng' },
  ] as const;

  const missingRateRows = Object.entries(trainingQuality.missingRatePctByField || {})
    .map(([field, missingRatePct]) => ({
      field,
      missingRatePct,
      missingCount: trainingQuality.missingCountByField?.[field] || 0,
    }))
    .sort((a, b) => b.missingRatePct - a.missingRatePct);

  const topOutlierRows: Array<{ field: string; stats: MlTrainingDataOutlierStats }> = Object.entries(trainingQuality.outlierStatsByField || {})
    .map(([field, stats]) => ({ field, stats }))
    .sort((a, b) => (b.stats?.outlierRatePct || 0) - (a.stats?.outlierRatePct || 0))
    .slice(0, 5);

  const monthlyCoverageChartData = trainingQuality.monthlyCoverage || [];

  const exportTaxReportExcel = async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bao cao thue');

    sheet.columns = [
      { header: 'Ngay', key: 'date', width: 16 },
      { header: 'Don da thanh toan', key: 'orders', width: 20 },
      { header: 'Tam tinh', key: 'net', width: 18 },
      { header: 'Thue GTGT', key: 'vat', width: 18 },
      { header: 'Tong thanh toan', key: 'gross', width: 20 },
    ];

    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = 'BAO CAO THUE GTGT';
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF1F2937' } };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('A2:E2');
    sheet.getCell('A2').value = `Ky bao cao: ${taxFromDate} den ${taxToDate}`;
    sheet.getCell('A2').alignment = { horizontal: 'center' };
    sheet.getCell('A2').font = { color: { argb: 'FF4B5563' } };

    sheet.getCell('A4').value = 'Tong don da thanh toan';
    sheet.getCell('B4').value = taxReport.summary.totalOrders ?? 0;
    sheet.getCell('A5').value = 'Tam tinh';
    sheet.getCell('B5').value = taxReport.summary.netAmount ?? 0;
    sheet.getCell('A6').value = 'Thue GTGT';
    sheet.getCell('B6').value = taxReport.summary.vatAmount ?? 0;
    sheet.getCell('A7').value = 'Tong thanh toan';
    sheet.getCell('B7').value = taxReport.summary.totalAmount ?? 0;

    const currencyFormat = '#,##0';
    sheet.getCell('B5').numFmt = currencyFormat;
    sheet.getCell('B6').numFmt = currencyFormat;
    sheet.getCell('B7').numFmt = currencyFormat;

    for (let row = 4; row <= 7; row++) {
      sheet.getCell(`A${row}`).font = { bold: true };
      sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      sheet.getCell(`A${row}`).border = thinBorder();
      sheet.getCell(`B${row}`).border = thinBorder();
    }

    const headerRowIndex = 9;
    const headerRow = sheet.getRow(headerRowIndex);
    headerRow.values = ['Ngay', 'Don da thanh toan', 'Tam tinh', 'Thue GTGT', 'Tong thanh toan'];
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell((cell) => {
      cell.border = thinBorder();
    });

    let rowPointer = headerRowIndex + 1;
    for (const item of taxReport.items) {
      const row = sheet.getRow(rowPointer);
      row.values = [
        item.date,
        item.totalOrders ?? 0,
        item.netAmount ?? 0,
        item.vatAmount ?? 0,
        item.totalAmount ?? 0,
      ];
      row.getCell(3).numFmt = currencyFormat;
      row.getCell(4).numFmt = currencyFormat;
      row.getCell(5).numFmt = currencyFormat;
      row.eachCell((cell) => {
        cell.border = thinBorder();
      });
      rowPointer += 1;
    }

    sheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tax-report-${taxFromDate}-to-${taxToDate}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Báo cáo</h1>

      <div className="flex gap-2 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t.key ? 'bg-white shadow' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {tab === 'daily' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Doanh thu theo giờ</h2>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            {hourlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={380}>
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} label={{ value: 'Giờ', position: 'insideBottomRight', offset: -5 }} />
                  <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 12 }}
                    label={{ value: 'Doanh thu (VNĐ)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }}
                    label={{ value: 'Số đơn', angle: 90, position: 'insideRight', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                    labelFormatter={(label) => `Lúc ${label}`}
                    formatter={(v, name) =>
                      name === 'Doanh thu' ? formatCurrency(Number(v)) : `${v} đơn`
                    }
                  />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="totalRevenue" name="Doanh thu"
                    stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorRevenue)" dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                  <Area yAxisId="right" type="monotone" dataKey="totalOrders" name="Số đơn"
                    stroke="#f59e0b" strokeWidth={2} fill="url(#colorOrders)" dot={{ r: 2, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-center py-12">Chưa có dữ liệu</p>}
          </div>
        )}

        {tab === 'weekly' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Doanh thu theo tuần</h2>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <input type="date" value={weeklyDate} onChange={(e) => setWeeklyDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''} formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="totalRevenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Doanh thu" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-center py-12">Chưa có dữ liệu</p>}
          </div>
        )}

        {false && tab === 'quality' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Chất lượng dữ liệu train AI</h2>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <input
                  type="date"
                  value={qualityFromDate}
                  onChange={(e) => setQualityFromDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-gray-400 text-sm">đến</span>
                <input
                  type="date"
                  value={qualityToDate}
                  onChange={(e) => setQualityToDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Số ngày kỳ vọng</p>
                <p className="text-xl font-semibold">{trainingQuality.expectedDays || 0}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Số dòng thực tế</p>
                <p className="text-xl font-semibold">{trainingQuality.totalRows || 0}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">Coverage toàn tập</p>
                <p className="text-xl font-semibold text-emerald-800">{formatPct(trainingQuality.datasetCoverageRatePct)}</p>
              </div>
            </div>

            {monthlyCoverageChartData.length > 0 ? (
              <div>
                <h3 className="text-base font-medium mb-3">Coverage theo tháng</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={monthlyCoverageChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="yearMonth" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'Coverage (%)') {
                          return [formatPct(Number(value)), name];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="expectedDays" name="Số ngày kỳ vọng" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="rows" name="Số dòng thực tế" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="coverageRatePct" name="Coverage (%)" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">Không có dữ liệu coverage theo tháng.</p>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div>
                <h3 className="text-base font-medium mb-3">Missing rate theo trường</h3>
                {missingRateRows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2 font-medium text-gray-500">Trường</th>
                          <th className="text-left py-2 px-2 font-medium text-gray-500">Thiếu (dòng)</th>
                          <th className="text-left py-2 px-2 font-medium text-gray-500">Thiếu (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {missingRateRows.map((row) => (
                          <tr key={row.field} className="border-b border-gray-100">
                            <td className="py-2 px-2">{fieldLabel(row.field)}</td>
                            <td className="py-2 px-2">{row.missingCount}</td>
                            <td className={`py-2 px-2 font-medium ${row.missingRatePct > 5 ? 'text-red-600' : 'text-gray-700'}`}>
                              {formatPct(row.missingRatePct)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400 py-6">Không có dữ liệu missing rate.</p>
                )}
              </div>

              <div>
                <h3 className="text-base font-medium mb-3">Top trường có outlier</h3>
                {topOutlierRows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2 font-medium text-gray-500">Trường</th>
                          <th className="text-left py-2 px-2 font-medium text-gray-500">Outlier (%)</th>
                          <th className="text-left py-2 px-2 font-medium text-gray-500">Outlier / Mẫu</th>
                          <th className="text-left py-2 px-2 font-medium text-gray-500">Fence (IQR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topOutlierRows.map(({ field, stats }) => (
                          <tr key={field} className="border-b border-gray-100">
                            <td className="py-2 px-2">{fieldLabel(field)}</td>
                            <td className={`py-2 px-2 font-medium ${stats.outlierRatePct > 10 ? 'text-amber-700' : 'text-gray-700'}`}>
                              {formatPct(stats.outlierRatePct)}
                            </td>
                            <td className="py-2 px-2">{stats.outlierCount} / {stats.samples}</td>
                            <td className="py-2 px-2 text-gray-600">
                              [{stats.lowerFence.toFixed(2)}, {stats.upperFence.toFixed(2)}]
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400 py-6">Không có dữ liệu outlier.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'best' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Sản phẩm bán chạy nhất</h2>
            {bestProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-medium text-gray-500">#</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Sản phẩm</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Số lượng bán</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bestProducts.map((p, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-3 px-2">{i + 1}</td>
                        <td className="py-3 px-2 font-medium">{p.menuItemName}</td>
                        <td className="py-3 px-2">{p.totalQuantitySold}</td>
                        <td className="py-3 px-2">{formatCurrency(p.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-gray-400 text-center py-12">Chưa có dữ liệu</p>}
          </div>
        )}

        {tab === 'tax' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Báo cáo thuế GTGT</h2>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <input
                  type="date"
                  value={taxFromDate}
                  onChange={(e) => setTaxFromDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-gray-400 text-sm">đến</span>
                <input
                  type="date"
                  value={taxToDate}
                  onChange={(e) => setTaxToDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={() => {
                    exportTaxReportExcel().catch(() => {
                      // keep silent; user can retry export
                    });
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-sm font-medium"
                >
                  <Download size={14} /> Xuất Excel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Tổng đơn đã thanh toán</p>
                <p className="text-xl font-semibold">{taxReport.summary.totalOrders || 0}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Tạm tính (chưa thuế)</p>
                <p className="text-xl font-semibold text-gray-800">{formatCurrency(taxReport.summary.netAmount || 0)}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-700">Thuế GTGT phải nộp</p>
                <p className="text-xl font-semibold text-amber-800">{formatCurrency(taxReport.summary.vatAmount || 0)}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">Tổng thanh toán</p>
                <p className="text-xl font-semibold text-emerald-800">{formatCurrency(taxReport.summary.totalAmount || 0)}</p>
              </div>
            </div>

            {taxReport.items.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={taxReport.items}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Legend />
                    <Bar dataKey="netAmount" name="Tạm tính" fill="#64748b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="vatAmount" name="Thuế GTGT" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="totalAmount" name="Tổng thanh toán" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 font-medium text-gray-500">Ngày</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-500">Đơn đã thanh toán</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-500">Tạm tính</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-500">Thuế GTGT</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-500">Tổng thanh toán</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxReport.items.map((item) => (
                        <tr key={item.date} className="border-b border-gray-100">
                          <td className="py-2 px-2">{item.date}</td>
                          <td className="py-2 px-2">{item.totalOrders}</td>
                          <td className="py-2 px-2">{formatCurrency(item.netAmount)}</td>
                          <td className="py-2 px-2 text-amber-700 font-medium">{formatCurrency(item.vatAmount)}</td>
                          <td className="py-2 px-2 font-medium">{formatCurrency(item.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-gray-400 text-center py-12">Khoảng thời gian này chưa có giao dịch đã thanh toán.</p>
            )}
          </div>
        )}

        {tab === 'low' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Nguyên liệu sắp hết</h2>
            {lowStock.length > 0 ? (
              <div className="space-y-3">
                {lowStock.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle size={20} className="text-red-500 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">{item.ingredientName}</p>
                      <p className="text-sm text-gray-500">
                        Tồn: <span className="text-red-600 font-medium">{item.quantity} {item.unit}</span> / Tối thiểu: {item.minimumStock} {item.unit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-green-600 text-center py-12">Tất cả nguyên liệu đều đủ hàng!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function thinBorder() {
  return {
    top: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
  };
}
