package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.*;
import C2SE._1.Capstone2.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
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

    @GetMapping("/ml-training-data/quality")
    public ResponseEntity<ApiResponse<MlTrainingDataQualityDTO>> getMlTrainingDataQuality(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Integer areaDensityScore) {
        MlTrainingDataQualityDTO quality = reportService.getMlTrainingDataQuality(fromDate, toDate, areaDensityScore);
        return ResponseEntity.ok(ApiResponse.success(quality));
    }

    @GetMapping(value = "/ml-training-data.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportMlTrainingDataCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Integer areaDensityScore) {
        List<MlTrainingDataRowDTO> rows = reportService.getMlTrainingData(fromDate, toDate, areaDensityScore);
        String fileName = "training_data_real_" + LocalDate.now() + ".csv";
        String csv = buildMlTrainingCsv(rows);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(csv.getBytes(StandardCharsets.UTF_8));
    }

    private String buildMlTrainingCsv(List<MlTrainingDataRowDTO> rows) {
        StringBuilder sb = new StringBuilder();
        sb.append("date,day_of_week,is_weekend,is_holiday,holiday_name,temperature,rainfall,event_impact_level,area_density_score,sales_1_day_ago,sales_7_days_ago,revenue,orders\n");

        for (MlTrainingDataRowDTO row : rows) {
            sb.append(row.getDate()).append(',')
                    .append(row.getDayOfWeek()).append(',')
                    .append(row.getIsWeekend()).append(',')
                    .append(row.getIsHoliday()).append(',')
                    .append(csvEscape(row.getHolidayName())).append(',')
                    .append(row.getTemperature() != null ? row.getTemperature() : 0.0).append(',')
                    .append(row.getRainfall() != null ? row.getRainfall() : 0.0).append(',')
                    .append(row.getEventImpactLevel() != null ? row.getEventImpactLevel() : 1).append(',')
                    .append(row.getAreaDensityScore() != null ? row.getAreaDensityScore() : 60).append(',')
                    .append(decimal(row.getSales1DayAgo())).append(',')
                    .append(decimal(row.getSales7DaysAgo())).append(',')
                    .append(decimal(row.getRevenue())).append(',')
                    .append(row.getOrders() != null ? row.getOrders() : 0)
                    .append('\n');
        }

        return sb.toString();
    }

    private String decimal(BigDecimal value) {
        return value == null ? "0" : value.toPlainString();
    }

    private String csvEscape(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        boolean needQuotes = raw.contains(",") || raw.contains("\"") || raw.contains("\n") || raw.contains("\r");
        String escaped = raw.replace("\"", "\"\"");
        return needQuotes ? "\"" + escaped + "\"" : escaped;
    }
}
