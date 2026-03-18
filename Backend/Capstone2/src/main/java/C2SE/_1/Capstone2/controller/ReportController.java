package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.*;
import C2SE._1.Capstone2.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/daily-sales")
    public ResponseEntity<ApiResponse<List<DailySalesReportDTO>>> getDailySales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getDailySalesReport(date)));
    }

    @GetMapping("/hourly-sales")
    public ResponseEntity<ApiResponse<List<DailySalesReportDTO>>> getHourlySales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getHourlySalesReport(date)));
    }

    @GetMapping("/weekly-sales")
    public ResponseEntity<ApiResponse<List<DailySalesReportDTO>>> getWeeklySales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getWeeklySalesReport(date)));
    }

    @GetMapping("/best-products")
    public ResponseEntity<ApiResponse<List<BestProductDTO>>> getBestProducts() {
        return ResponseEntity.ok(ApiResponse.success(reportService.getBestProducts()));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<ApiResponse<List<InventoryDTO>>> getLowStock() {
        return ResponseEntity.ok(ApiResponse.success(reportService.getLowStockReport()));
    }

    @GetMapping("/tax")
    public ResponseEntity<ApiResponse<TaxReportResponseDTO>> getTaxReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getTaxReport(fromDate, toDate)));
    }
}
