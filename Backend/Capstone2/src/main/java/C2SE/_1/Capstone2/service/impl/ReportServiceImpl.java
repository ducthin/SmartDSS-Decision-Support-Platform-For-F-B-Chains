package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.BestProductDTO;
import C2SE._1.Capstone2.dto.DailySalesReportDTO;
import C2SE._1.Capstone2.dto.InventoryDTO;
import C2SE._1.Capstone2.dto.MlTrainingDataMonthlyCoverageDTO;
import C2SE._1.Capstone2.dto.MlTrainingDataOutlierStatsDTO;
import C2SE._1.Capstone2.dto.MlTrainingDataQualityDTO;
import C2SE._1.Capstone2.dto.MlTrainingDataRowDTO;
import C2SE._1.Capstone2.dto.TaxReportItemDTO;
import C2SE._1.Capstone2.dto.TaxReportResponseDTO;
import C2SE._1.Capstone2.entity.Event;
import C2SE._1.Capstone2.entity.HolidayCalendar;
import C2SE._1.Capstone2.entity.Order;
import C2SE._1.Capstone2.entity.OrderStatus;
import C2SE._1.Capstone2.entity.SalesTransaction;
import C2SE._1.Capstone2.entity.WeatherData;
import C2SE._1.Capstone2.repository.EventRepository;
import C2SE._1.Capstone2.repository.HolidayCalendarRepository;
import C2SE._1.Capstone2.mapper.InventoryMapper;
import C2SE._1.Capstone2.repository.InventoryRepository;
import C2SE._1.Capstone2.repository.OrderRepository;
import C2SE._1.Capstone2.repository.SalesItemRepository;
import C2SE._1.Capstone2.repository.SalesTransactionRepository;
import C2SE._1.Capstone2.repository.WeatherDataRepository;
import C2SE._1.Capstone2.service.ReportService;
import C2SE._1.Capstone2.util.AreaDensityScoreEstimator;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.YearMonth;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    private static final double[] AVG_TEMP = {22.5, 23.2, 25.5, 28.0, 30.5, 31.8, 31.5, 31.0, 28.5, 26.0, 24.0, 22.8};
    private static final double[] AVG_RAIN = {10, 5, 3, 5, 10, 10, 8, 12, 50, 80, 50, 25};
    private static final int DEFAULT_AREA_DENSITY_SCORE = 60;

    private final SalesTransactionRepository salesTransactionRepository;
    private final SalesItemRepository salesItemRepository;
    private final InventoryRepository inventoryRepository;
    private final OrderRepository orderRepository;
    private final WeatherDataRepository weatherDataRepository;
    private final HolidayCalendarRepository holidayCalendarRepository;
    private final EventRepository eventRepository;
    private final InventoryMapper inventoryMapper;
    @Value("${app.timezone:Asia/Ho_Chi_Minh}")
    private String appTimezone;
    @Value("${app.db.timezone:UTC}")
    private String dbTimezone;

    @Override
    public List<DailySalesReportDTO> getDailySalesReport(LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now(resolveZoneId());
        List<SalesTransaction> txList = fetchPaidTransactionsForDateRange(target, target);
        long totalOrders = txList.stream()
                .map(this::toAppBusinessDateTime)
                .filter(Objects::nonNull)
                .filter(dt -> dt.toLocalDate().equals(target))
                .count();
        BigDecimal totalRevenue = txList.stream()
                .filter(tx -> {
                    LocalDateTime dt = toAppBusinessDateTime(tx);
                    return dt != null && dt.toLocalDate().equals(target);
                })
                .map(tx -> tx.getTotalAmount() == null ? BigDecimal.ZERO : tx.getTotalAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return List.of(DailySalesReportDTO.builder()
                .date(target.toString())
                .totalOrders(totalOrders)
                .totalRevenue(totalRevenue)
                .build());
    }

    @Override
    public List<DailySalesReportDTO> getDailyOperationalSalesReport(LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now(resolveZoneId());
        List<Order> orders = fetchCompletedOrdersForDateRange(target, target);
        long totalOrders = orders.stream()
                .map(this::toAppBusinessDateTime)
                .filter(Objects::nonNull)
                .filter(dt -> dt.toLocalDate().equals(target))
                .count();
        BigDecimal totalRevenue = orders.stream()
                .filter(order -> {
                    LocalDateTime dt = toAppBusinessDateTime(order);
                    return dt != null && dt.toLocalDate().equals(target);
                })
                .map(order -> order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return List.of(DailySalesReportDTO.builder()
                .date(target.toString())
                .totalOrders(totalOrders)
                .totalRevenue(totalRevenue)
                .build());
    }

    @Override
    public List<DailySalesReportDTO> getHourlySalesReport(LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now(resolveZoneId());
        int maxDisplayHour = target.equals(LocalDate.now(resolveZoneId()))
                ? LocalTime.now(resolveZoneId()).getHour()
                : 23;

        List<SalesTransaction> txList = fetchPaidTransactionsForDateRange(target, target);

        Map<Integer, DailySalesReportDTO> hourMap = new HashMap<>();
        for (SalesTransaction tx : txList) {
            LocalDateTime businessTime = toAppBusinessDateTime(tx);
            if (businessTime == null || !businessTime.toLocalDate().equals(target)) {
                continue;
            }
            int hour = businessTime.getHour();
            if (hour > maxDisplayHour) continue;
            DailySalesReportDTO existing = hourMap.get(hour);
            BigDecimal amount = tx.getTotalAmount() == null ? BigDecimal.ZERO : tx.getTotalAmount();
            if (existing == null) {
                hourMap.put(hour, DailySalesReportDTO.builder()
                        .date(String.format("%02d:00", hour))
                        .totalOrders(1L)
                        .totalRevenue(amount)
                        .build());
            } else {
                existing.setTotalOrders(existing.getTotalOrders() + 1);
                existing.setTotalRevenue(existing.getTotalRevenue().add(amount));
            }
        }

        List<DailySalesReportDTO> reports = new ArrayList<>();
        for (int h = 0; h < 24; h++) {
            if (h > maxDisplayHour) {
                reports.add(DailySalesReportDTO.builder()
                        .date(String.format("%02d:00", h))
                        .totalOrders(0L)
                        .totalRevenue(BigDecimal.ZERO)
                        .build());
                continue;
            }
            reports.add(hourMap.getOrDefault(h, DailySalesReportDTO.builder()
                    .date(String.format("%02d:00", h))
                    .totalOrders(0L)
                    .totalRevenue(BigDecimal.ZERO)
                    .build()));
        }
        return reports;
    }

    @Override
    public List<DailySalesReportDTO> getWeeklySalesReport(LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now(resolveZoneId());
        LocalDate weekStart = target.minusDays(6);
        List<SalesTransaction> txList = fetchPaidTransactionsForDateRange(weekStart, target);

        Map<String, DailySalesReportDTO> dateMap = new HashMap<>();
        for (SalesTransaction tx : txList) {
            LocalDateTime businessTime = toAppBusinessDateTime(tx);
            if (businessTime == null) continue;
            LocalDate d = businessTime.toLocalDate();
            if (d.isBefore(weekStart) || d.isAfter(target)) continue;
            String dateStr = d.toString();
            DailySalesReportDTO existing = dateMap.get(dateStr);
            BigDecimal amount = tx.getTotalAmount() == null ? BigDecimal.ZERO : tx.getTotalAmount();
            if (existing == null) {
                dateMap.put(dateStr, DailySalesReportDTO.builder()
                        .date(dateStr)
                        .totalOrders(1L)
                        .totalRevenue(amount)
                        .build());
            } else {
                existing.setTotalOrders(existing.getTotalOrders() + 1);
                existing.setTotalRevenue(existing.getTotalRevenue().add(amount));
            }
        }

        List<DailySalesReportDTO> reports = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            String d = weekStart.plusDays(i).toString();
            reports.add(dateMap.getOrDefault(d, DailySalesReportDTO.builder()
                    .date(d)
                    .totalOrders(0L)
                    .totalRevenue(BigDecimal.ZERO)
                    .build()));
        }
        return reports;
    }

    @Override
    public List<BestProductDTO> getBestProducts() {
        LocalDate today = LocalDate.now(resolveZoneId());
        LocalDateTime start = today.minusDays(30).atStartOfDay();
        LocalDateTime end = today.atTime(LocalTime.MAX);

        List<Object[]> results = salesItemRepository.findBestSellingProducts(start, end);

        return results.stream()
                .map(row -> BestProductDTO.builder()
                        .menuItemId(((Number) row[0]).longValue())
                        .menuItemName((String) row[1])
                        .totalQuantitySold(((Number) row[2]).longValue())
                        .totalRevenue(toBigDecimal(row[3]))
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<InventoryDTO> getLowStockReport() {
        return inventoryMapper.toDTOList(inventoryRepository.findLowStock());
    }

    @Override
    public TaxReportResponseDTO getTaxReport(LocalDate fromDate, LocalDate toDate) {
        LocalDate endDate = toDate != null ? toDate : LocalDate.now(resolveZoneId());
        LocalDate startDate = fromDate != null ? fromDate : endDate.minusDays(29);
        if (startDate.isAfter(endDate)) {
            LocalDate tmp = startDate;
            startDate = endDate;
            endDate = tmp;
        }

        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);

        List<Object[]> summaryRows = salesTransactionRepository.findTaxSummary(start, end);
        Object[] summaryRow = normalizeSummaryRow(summaryRows == null || summaryRows.isEmpty() ? null : summaryRows.get(0));
        TaxReportItemDTO summary = TaxReportItemDTO.builder()
                .date(startDate + " -> " + endDate)
                .totalOrders(summaryRow == null ? 0L : ((Number) summaryRow[0]).longValue())
                .netAmount(summaryRow == null ? BigDecimal.ZERO : toBigDecimal(summaryRow[1]))
                .vatAmount(summaryRow == null ? BigDecimal.ZERO : toBigDecimal(summaryRow[2]))
                .totalAmount(summaryRow == null ? BigDecimal.ZERO : toBigDecimal(summaryRow[3]))
                .build();

        List<Object[]> rows = salesTransactionRepository.findDailyTaxBreakdown(start, end);
        List<TaxReportItemDTO> items = rows.stream()
                .map(row -> TaxReportItemDTO.builder()
                        .date(String.valueOf(row[0]))
                        .totalOrders(((Number) row[1]).longValue())
                        .netAmount(toBigDecimal(row[2]))
                        .vatAmount(toBigDecimal(row[3]))
                        .totalAmount(toBigDecimal(row[4]))
                        .build())
                .toList();

        return TaxReportResponseDTO.builder()
                .summary(summary)
                .items(items)
                .build();
    }

    @Override
    public List<MlTrainingDataRowDTO> getMlTrainingData(LocalDate fromDate, LocalDate toDate, Integer areaDensityScore) {
        LocalDate endDate = toDate != null ? toDate : LocalDate.now(resolveZoneId());
        LocalDate startDate = fromDate != null ? fromDate : endDate.minusDays(365);
        if (startDate.isAfter(endDate)) {
            LocalDate temp = startDate;
            startDate = endDate;
            endDate = temp;
        }

        List<SalesTransaction> txList = fetchPaidTransactionsForDateRange(startDate, endDate);
        Map<LocalDate, BigDecimal> revenueByDate = new HashMap<>();
        Map<LocalDate, Long> ordersByDate = new HashMap<>();

        for (SalesTransaction tx : txList) {
            LocalDateTime businessTime = toAppBusinessDateTime(tx);
            if (businessTime == null) {
                continue;
            }
            LocalDate date = businessTime.toLocalDate();
            if (date.isBefore(startDate) || date.isAfter(endDate)) {
                continue;
            }

            BigDecimal amount = tx.getTotalAmount() == null ? BigDecimal.ZERO : tx.getTotalAmount();
            revenueByDate.merge(date, amount, BigDecimal::add);
            ordersByDate.merge(date, 1L, (left, right) -> left + right);
        }

        Map<LocalDate, WeatherData> weatherByDate = weatherDataRepository
                .findByRecordDateBetweenOrderByRecordDateDesc(startDate, endDate)
                .stream()
                .collect(Collectors.toMap(WeatherData::getRecordDate, row -> row, (left, right) -> left));

        Map<LocalDate, String> holidayNameByDate = holidayCalendarRepository
                .findByHolidayDateBetweenOrderByHolidayDateAsc(startDate, endDate)
                .stream()
                .collect(Collectors.groupingBy(
                        HolidayCalendar::getHolidayDate,
                        Collectors.mapping(HolidayCalendar::getName,
                                Collectors.collectingAndThen(Collectors.toList(), names -> String.join(" | ", names)))));

        Map<LocalDate, Integer> eventImpactByDate = buildEventImpactByDate(startDate, endDate);
        int baseAreaDensity = AreaDensityScoreEstimator.normalizeBaseScore(areaDensityScore, DEFAULT_AREA_DENSITY_SCORE);
        BigDecimal lagFallback = estimateLagFallback(revenueByDate);

        List<MlTrainingDataRowDTO> rows = new ArrayList<>();
        for (LocalDate current = startDate; !current.isAfter(endDate); current = current.plusDays(1)) {
            BigDecimal revenue = revenueByDate.getOrDefault(current, BigDecimal.ZERO);
            long orders = ordersByDate.getOrDefault(current, 0L);
            BigDecimal sales1DayAgo = revenueByDate.getOrDefault(current.minusDays(1), lagFallback);
            BigDecimal sales7DaysAgo = revenueByDate.getOrDefault(current.minusDays(7), lagFallback);

            WeatherData weatherData = weatherByDate.get(current);
            int monthIndex = current.getMonthValue() - 1;
            double temperature = weatherData != null && weatherData.getTemperature() != null
                    ? weatherData.getTemperature()
                    : AVG_TEMP[monthIndex];
            double rainfall = weatherData != null && weatherData.getRainfall() != null
                    ? weatherData.getRainfall()
                    : AVG_RAIN[monthIndex];

            String holidayName = holidayNameByDate.getOrDefault(current, "");
            int isHoliday = holidayName.isBlank() ? 0 : 1;
            int maxImpactLevel = eventImpactByDate.getOrDefault(current, 1);
            int areaDensityForDate = AreaDensityScoreEstimator.estimate(baseAreaDensity, current, isHoliday, maxImpactLevel);

            rows.add(MlTrainingDataRowDTO.builder()
                    .date(current)
                    .dayOfWeek(current.getDayOfWeek().getValue())
                    .isWeekend(current.getDayOfWeek().getValue() >= 6 ? 1 : 0)
                    .isHoliday(isHoliday)
                    .holidayName(holidayName)
                    .temperature(temperature)
                    .rainfall(rainfall)
                    .eventImpactLevel(maxImpactLevel)
                    .areaDensityScore(areaDensityForDate)
                    .sales1DayAgo(sales1DayAgo)
                    .sales7DaysAgo(sales7DaysAgo)
                    .revenue(revenue)
                    .orders(orders)
                    .build());
        }

        return rows;
    }

    @Override
    public MlTrainingDataQualityDTO getMlTrainingDataQuality(LocalDate fromDate, LocalDate toDate, Integer areaDensityScore) {
        LocalDate endDate = toDate != null ? toDate : LocalDate.now(resolveZoneId());
        LocalDate startDate = fromDate != null ? fromDate : endDate.minusDays(365);
        if (startDate.isAfter(endDate)) {
            LocalDate temp = startDate;
            startDate = endDate;
            endDate = temp;
        }

        List<MlTrainingDataRowDTO> rows = getMlTrainingData(startDate, endDate, areaDensityScore);
        long expectedDays = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        long totalRows = rows.size();

        Map<String, Long> missingCountByField = buildMissingCountByField(rows);
        Map<String, Double> missingRatePctByField = buildMissingRateByField(missingCountByField, totalRows);
        Map<String, MlTrainingDataOutlierStatsDTO> outlierStatsByField = buildOutlierStatsByField(rows);
        List<MlTrainingDataMonthlyCoverageDTO> monthlyCoverage = buildMonthlyCoverage(rows, startDate, endDate);

        return MlTrainingDataQualityDTO.builder()
                .fromDate(startDate)
                .toDate(endDate)
                .expectedDays(expectedDays)
                .totalRows(totalRows)
                .datasetCoverageRatePct(ratePct(totalRows, expectedDays))
                .missingCountByField(missingCountByField)
                .missingRatePctByField(missingRatePctByField)
                .outlierStatsByField(outlierStatsByField)
                .monthlyCoverage(monthlyCoverage)
                .build();
    }

    private Map<String, Long> buildMissingCountByField(List<MlTrainingDataRowDTO> rows) {
        Map<String, Long> missing = new LinkedHashMap<>();
        missing.put("date", rows.stream().filter(row -> row.getDate() == null).count());
        missing.put("day_of_week", rows.stream().filter(row -> row.getDayOfWeek() == null).count());
        missing.put("is_weekend", rows.stream().filter(row -> row.getIsWeekend() == null).count());
        missing.put("is_holiday", rows.stream().filter(row -> row.getIsHoliday() == null).count());
        missing.put("holiday_name", rows.stream()
                .filter(row -> row.getIsHoliday() != null && row.getIsHoliday() == 1)
                .filter(row -> row.getHolidayName() == null || row.getHolidayName().isBlank())
                .count());
        missing.put("temperature", rows.stream().filter(row -> row.getTemperature() == null).count());
        missing.put("rainfall", rows.stream().filter(row -> row.getRainfall() == null).count());
        missing.put("event_impact_level", rows.stream().filter(row -> row.getEventImpactLevel() == null).count());
        missing.put("area_density_score", rows.stream().filter(row -> row.getAreaDensityScore() == null).count());
        missing.put("sales_1_day_ago", rows.stream().filter(row -> row.getSales1DayAgo() == null).count());
        missing.put("sales_7_days_ago", rows.stream().filter(row -> row.getSales7DaysAgo() == null).count());
        missing.put("revenue", rows.stream().filter(row -> row.getRevenue() == null).count());
        missing.put("orders", rows.stream().filter(row -> row.getOrders() == null).count());
        return missing;
    }

    private Map<String, Double> buildMissingRateByField(Map<String, Long> missingCountByField, long totalRows) {
        Map<String, Double> rates = new LinkedHashMap<>();
        for (Map.Entry<String, Long> entry : missingCountByField.entrySet()) {
            rates.put(entry.getKey(), ratePct(entry.getValue(), totalRows));
        }
        return rates;
    }

    private Map<String, MlTrainingDataOutlierStatsDTO> buildOutlierStatsByField(List<MlTrainingDataRowDTO> rows) {
        Map<String, MlTrainingDataOutlierStatsDTO> stats = new LinkedHashMap<>();
        stats.put("temperature", calculateOutlierStats(extractNumeric(rows, MlTrainingDataRowDTO::getTemperature)));
        stats.put("rainfall", calculateOutlierStats(extractNumeric(rows, MlTrainingDataRowDTO::getRainfall)));
        stats.put("area_density_score", calculateOutlierStats(extractNumeric(rows, MlTrainingDataRowDTO::getAreaDensityScore)));
        stats.put("sales_1_day_ago", calculateOutlierStats(extractNumeric(rows, MlTrainingDataRowDTO::getSales1DayAgo)));
        stats.put("sales_7_days_ago", calculateOutlierStats(extractNumeric(rows, MlTrainingDataRowDTO::getSales7DaysAgo)));
        stats.put("revenue", calculateOutlierStats(extractNumeric(rows, MlTrainingDataRowDTO::getRevenue)));
        stats.put("orders", calculateOutlierStats(extractNumeric(rows, MlTrainingDataRowDTO::getOrders)));
        return stats;
    }

    private List<Double> extractNumeric(List<MlTrainingDataRowDTO> rows, Function<MlTrainingDataRowDTO, Number> extractor) {
        return rows.stream()
                .map(extractor)
                .filter(Objects::nonNull)
                .map(Number::doubleValue)
                .toList();
    }

    private MlTrainingDataOutlierStatsDTO calculateOutlierStats(List<Double> values) {
        if (values.isEmpty()) {
            return MlTrainingDataOutlierStatsDTO.builder()
                    .samples(0L)
                    .q1(0.0)
                    .q3(0.0)
                    .iqr(0.0)
                    .lowerFence(0.0)
                    .upperFence(0.0)
                    .outlierCount(0L)
                    .outlierRatePct(0.0)
                    .build();
        }

        List<Double> sorted = new ArrayList<>(values);
        sorted.sort(Double::compareTo);

        double q1 = quantile(sorted, 0.25);
        double q3 = quantile(sorted, 0.75);
        double iqr = q3 - q1;
        double lowerFence = q1 - 1.5 * iqr;
        double upperFence = q3 + 1.5 * iqr;
        long outlierCount = values.stream()
                .filter(v -> v < lowerFence || v > upperFence)
                .count();

        return MlTrainingDataOutlierStatsDTO.builder()
                .samples((long) values.size())
                .q1(round2(q1))
                .q3(round2(q3))
                .iqr(round2(iqr))
                .lowerFence(round2(lowerFence))
                .upperFence(round2(upperFence))
                .outlierCount(outlierCount)
                .outlierRatePct(ratePct(outlierCount, values.size()))
                .build();
    }

    private double quantile(List<Double> sortedValues, double quantile) {
        if (sortedValues.isEmpty()) {
            return 0.0;
        }
        if (sortedValues.size() == 1) {
            return sortedValues.get(0);
        }

        double position = (sortedValues.size() - 1) * quantile;
        int lower = (int) Math.floor(position);
        int upper = (int) Math.ceil(position);
        if (lower == upper) {
            return sortedValues.get(lower);
        }

        double lowerValue = sortedValues.get(lower);
        double upperValue = sortedValues.get(upper);
        double weight = position - lower;
        return lowerValue + (upperValue - lowerValue) * weight;
    }

    private List<MlTrainingDataMonthlyCoverageDTO> buildMonthlyCoverage(
            List<MlTrainingDataRowDTO> rows,
            LocalDate startDate,
            LocalDate endDate
    ) {
        Map<LocalDate, MlTrainingDataRowDTO> rowByDate = rows.stream()
                .filter(row -> row.getDate() != null)
                .collect(Collectors.toMap(MlTrainingDataRowDTO::getDate, row -> row, (left, right) -> right));

        List<MlTrainingDataMonthlyCoverageDTO> monthly = new ArrayList<>();
        YearMonth cursor = YearMonth.from(startDate);
        YearMonth endMonth = YearMonth.from(endDate);

        while (!cursor.isAfter(endMonth)) {
            LocalDate monthStart = cursor.atDay(1);
            LocalDate monthEnd = cursor.atEndOfMonth();
            LocalDate scopedStart = monthStart.isBefore(startDate) ? startDate : monthStart;
            LocalDate scopedEnd = monthEnd.isAfter(endDate) ? endDate : monthEnd;
            long expectedDays = ChronoUnit.DAYS.between(scopedStart, scopedEnd) + 1;

            long rowsCount = 0L;
            long totalOrders = 0L;
            BigDecimal totalRevenue = BigDecimal.ZERO;
            for (LocalDate date = scopedStart; !date.isAfter(scopedEnd); date = date.plusDays(1)) {
                MlTrainingDataRowDTO row = rowByDate.get(date);
                if (row == null) {
                    continue;
                }
                rowsCount++;
                totalOrders += row.getOrders() != null ? row.getOrders() : 0L;
                totalRevenue = totalRevenue.add(row.getRevenue() != null ? row.getRevenue() : BigDecimal.ZERO);
            }

            monthly.add(MlTrainingDataMonthlyCoverageDTO.builder()
                    .yearMonth(cursor.toString())
                    .fromDate(scopedStart)
                    .toDate(scopedEnd)
                    .expectedDays(expectedDays)
                    .rows(rowsCount)
                    .coverageRatePct(ratePct(rowsCount, expectedDays))
                    .totalRevenue(totalRevenue)
                    .totalOrders(totalOrders)
                    .build());

            cursor = cursor.plusMonths(1);
        }

        return monthly;
    }

    private double ratePct(long value, long total) {
        if (total <= 0) {
            return 0.0;
        }
        return round2((value * 100.0) / total);
    }

    private double round2(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private Map<LocalDate, Integer> buildEventImpactByDate(LocalDate fromDate, LocalDate toDate) {
        Map<LocalDate, Integer> impactByDate = new HashMap<>();
        List<Event> events = eventRepository.findActiveOverlappingDateRange(fromDate, toDate);

        for (Event event : events) {
            LocalDate start = event.getStartDate().isBefore(fromDate) ? fromDate : event.getStartDate();
            LocalDate end = event.getEndDate().isAfter(toDate) ? toDate : event.getEndDate();
            int impactLevel = mapImpactLevel(event.getExpectedImpact());

            for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
                impactByDate.merge(date, impactLevel, (left, right) -> left >= right ? left : right);
            }
        }

        return impactByDate;
    }

    private int mapImpactLevel(Event.ImpactLevel level) {
        if (level == null) {
            return 1;
        }
        return switch (level) {
            case CRITICAL -> 4;
            case HIGH -> 3;
            case MEDIUM -> 2;
            case LOW -> 1;
        };
    }

    private BigDecimal estimateLagFallback(Map<LocalDate, BigDecimal> revenueByDate) {
        List<BigDecimal> positiveRevenue = revenueByDate.values().stream()
                .filter(Objects::nonNull)
                .filter(value -> value.compareTo(BigDecimal.ZERO) > 0)
                .toList();
        if (positiveRevenue.isEmpty()) {
            return BigDecimal.ZERO;
        }

        BigDecimal sum = positiveRevenue.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(positiveRevenue.size()), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof BigDecimal) return (BigDecimal) val;
        return BigDecimal.valueOf(((Number) val).doubleValue());
    }

    private Object[] normalizeSummaryRow(Object[] rawRow) {
        if (rawRow == null || rawRow.length == 0) {
            return null;
        }
        if (rawRow.length == 1 && rawRow[0] instanceof Object[] nested) {
            return nested;
        }
        return rawRow;
    }

    private ZoneId resolveZoneId() {
        try {
            return ZoneId.of(appTimezone);
        } catch (Exception ex) {
            return ZoneId.of("Asia/Ho_Chi_Minh");
        }
    }

    private ZoneId resolveDbZoneId() {
        try {
            return ZoneId.of(dbTimezone);
        } catch (Exception ex) {
            return ZoneId.of("UTC");
        }
    }

    private List<SalesTransaction> fetchPaidTransactionsForDateRange(LocalDate fromDate, LocalDate toDate) {
        LocalDateTime appStart = fromDate.atStartOfDay();
        LocalDateTime appEnd = toDate.atTime(LocalTime.MAX);
        LocalDateTime dbStart = toDbLocalDateTime(appStart);
        LocalDateTime dbEnd = toDbLocalDateTime(appEnd);
        return salesTransactionRepository.findPaidTransactionsInRange(dbStart, dbEnd);
    }

    private List<Order> fetchCompletedOrdersForDateRange(LocalDate fromDate, LocalDate toDate) {
        LocalDateTime appStart = fromDate.atStartOfDay();
        LocalDateTime appEnd = toDate.atTime(LocalTime.MAX);
        LocalDateTime dbStart = toDbLocalDateTime(appStart);
        LocalDateTime dbEnd = toDbLocalDateTime(appEnd);
        return orderRepository.findByStatusInBusinessRange(OrderStatus.COMPLETED, dbStart, dbEnd);
    }

    private LocalDateTime toDbLocalDateTime(LocalDateTime appLocalDateTime) {
        ZoneId appZone = resolveZoneId();
        ZoneId dbZone = resolveDbZoneId();
        ZonedDateTime zoned = appLocalDateTime.atZone(appZone).withZoneSameInstant(dbZone);
        return zoned.toLocalDateTime();
    }

    private LocalDateTime toAppBusinessDateTime(SalesTransaction tx) {
        if (tx == null) return null;
        LocalDateTime source = tx.getPaidAt() != null ? tx.getPaidAt()
                : (tx.getUpdatedAt() != null ? tx.getUpdatedAt() : tx.getCreatedAt());
        if (source == null) return null;
        ZoneId dbZone = resolveDbZoneId();
        ZoneId appZone = resolveZoneId();
        return source.atZone(dbZone).withZoneSameInstant(appZone).toLocalDateTime();
    }

    private LocalDateTime toAppBusinessDateTime(Order order) {
        if (order == null) return null;
        LocalDateTime source = order.getUpdatedAt() != null ? order.getUpdatedAt() : order.getCreatedAt();
        if (source == null) return null;
        ZoneId dbZone = resolveDbZoneId();
        ZoneId appZone = resolveZoneId();
        return source.atZone(dbZone).withZoneSameInstant(appZone).toLocalDateTime();
    }
}
