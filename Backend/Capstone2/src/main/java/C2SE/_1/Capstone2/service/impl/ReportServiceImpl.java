package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.BestProductDTO;
import C2SE._1.Capstone2.dto.DailySalesReportDTO;
import C2SE._1.Capstone2.dto.InventoryDTO;
import C2SE._1.Capstone2.dto.TaxReportItemDTO;
import C2SE._1.Capstone2.dto.TaxReportResponseDTO;
import C2SE._1.Capstone2.mapper.InventoryMapper;
import C2SE._1.Capstone2.repository.InventoryRepository;
import C2SE._1.Capstone2.repository.SalesItemRepository;
import C2SE._1.Capstone2.repository.SalesTransactionRepository;
import C2SE._1.Capstone2.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    private final SalesTransactionRepository salesTransactionRepository;
    private final SalesItemRepository salesItemRepository;
    private final InventoryRepository inventoryRepository;
    private final InventoryMapper inventoryMapper;
    @Value("${app.timezone:Asia/Ho_Chi_Minh}")
    private String appTimezone;

    @Override
    public List<DailySalesReportDTO> getDailySalesReport(LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now(resolveZoneId());
        LocalDateTime start = target.atStartOfDay();
        LocalDateTime end = target.atTime(LocalTime.MAX);

        List<Object[]> results = salesTransactionRepository.findDailySalesGrouped(start, end);

        if (results.isEmpty()) {
            return List.of(DailySalesReportDTO.builder()
                    .date(target.toString())
                    .totalOrders(0L)
                    .totalRevenue(BigDecimal.ZERO)
                    .build());
        }

        Object[] row = results.get(0);
        return List.of(DailySalesReportDTO.builder()
                .date(target.toString())
                .totalOrders(((Number) row[1]).longValue())
                .totalRevenue(toBigDecimal(row[2]))
                .build());
    }

    @Override
    public List<DailySalesReportDTO> getHourlySalesReport(LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now(resolveZoneId());
        LocalDateTime start = target.atStartOfDay();
        LocalDateTime end = target.atTime(LocalTime.MAX);

        List<Object[]> results = salesTransactionRepository.findHourlySales(start, end);

        Map<Integer, DailySalesReportDTO> hourMap = new HashMap<>();
        for (Object[] row : results) {
            int hour = ((Number) row[0]).intValue();
            hourMap.put(hour, DailySalesReportDTO.builder()
                    .date(String.format("%02d:00", hour))
                    .totalOrders(((Number) row[1]).longValue())
                    .totalRevenue(toBigDecimal(row[2]))
                    .build());
        }

        List<DailySalesReportDTO> reports = new ArrayList<>();
        for (int h = 0; h < 24; h++) {
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
        LocalDateTime start = weekStart.atStartOfDay();
        LocalDateTime end = target.atTime(LocalTime.MAX);

        List<Object[]> results = salesTransactionRepository.findDailySalesGrouped(start, end);

        Map<String, DailySalesReportDTO> dateMap = new HashMap<>();
        for (Object[] row : results) {
            String dateStr = row[0].toString();
            dateMap.put(dateStr, DailySalesReportDTO.builder()
                    .date(dateStr)
                    .totalOrders(((Number) row[1]).longValue())
                    .totalRevenue(toBigDecimal(row[2]))
                    .build());
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
}
