package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.BestProductDTO;
import C2SE._1.Capstone2.dto.DailySalesReportDTO;
import C2SE._1.Capstone2.dto.InventoryDTO;
import C2SE._1.Capstone2.entity.SalesTransaction;
import C2SE._1.Capstone2.mapper.InventoryMapper;
import C2SE._1.Capstone2.repository.InventoryRepository;
import C2SE._1.Capstone2.repository.SalesItemRepository;
import C2SE._1.Capstone2.repository.SalesTransactionRepository;
import C2SE._1.Capstone2.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    private final SalesTransactionRepository salesTransactionRepository;
    private final SalesItemRepository salesItemRepository;
    private final InventoryRepository inventoryRepository;
    private final InventoryMapper inventoryMapper;

    @Override
    public List<DailySalesReportDTO> getDailySalesReport() {
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.atTime(LocalTime.MAX);

        List<SalesTransaction> sales = salesTransactionRepository.findByCreatedAtBetween(start, end);

        DailySalesReportDTO report = DailySalesReportDTO.builder()
                .date(today.toString())
                .totalOrders((long) sales.size())
                .totalRevenue(sales.stream()
                        .map(SalesTransaction::getTotalAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add))
                .build();

        return List.of(report);
    }

    @Override
    public List<DailySalesReportDTO> getWeeklySalesReport() {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.minusDays(6);

        List<DailySalesReportDTO> reports = new ArrayList<>();

        for (int i = 0; i < 7; i++) {
            LocalDate date = weekStart.plusDays(i);
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.atTime(LocalTime.MAX);

            List<SalesTransaction> sales = salesTransactionRepository.findByCreatedAtBetween(start, end);

            DailySalesReportDTO report = DailySalesReportDTO.builder()
                    .date(date.toString())
                    .totalOrders((long) sales.size())
                    .totalRevenue(sales.stream()
                            .map(SalesTransaction::getTotalAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add))
                    .build();

            reports.add(report);
        }

        return reports;
    }

    @Override
    public List<BestProductDTO> getBestProducts() {
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.minusDays(30).atStartOfDay();
        LocalDateTime end = today.atTime(LocalTime.MAX);

        List<Object[]> results = salesItemRepository.findBestSellingProducts(start, end);

        return results.stream()
                .map(row -> BestProductDTO.builder()
                        .menuItemId((Long) row[0])
                        .menuItemName((String) row[1])
                        .totalQuantitySold((Long) row[2])
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<InventoryDTO> getLowStockReport() {
        return inventoryMapper.toDTOList(inventoryRepository.findLowStock());
    }
}
