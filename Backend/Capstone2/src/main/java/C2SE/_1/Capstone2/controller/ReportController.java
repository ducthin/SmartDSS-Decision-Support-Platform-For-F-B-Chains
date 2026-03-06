package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.*;
import C2SE._1.Capstone2.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/daily-sales")
    public ResponseEntity<ApiResponse<List<DailySalesReportDTO>>> getDailySales() {
        return ResponseEntity.ok(ApiResponse.success(reportService.getDailySalesReport()));
    }

    @GetMapping("/weekly-sales")
    public ResponseEntity<ApiResponse<List<DailySalesReportDTO>>> getWeeklySales() {
        return ResponseEntity.ok(ApiResponse.success(reportService.getWeeklySalesReport()));
    }

    @GetMapping("/best-products")
    public ResponseEntity<ApiResponse<List<BestProductDTO>>> getBestProducts() {
        return ResponseEntity.ok(ApiResponse.success(reportService.getBestProducts()));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<ApiResponse<List<InventoryDTO>>> getLowStock() {
        return ResponseEntity.ok(ApiResponse.success(reportService.getLowStockReport()));
    }
}
