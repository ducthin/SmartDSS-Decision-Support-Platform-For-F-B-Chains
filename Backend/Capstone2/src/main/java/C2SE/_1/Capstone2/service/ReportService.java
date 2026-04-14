package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.BestProductDTO;
import C2SE._1.Capstone2.dto.DailySalesReportDTO;
import C2SE._1.Capstone2.dto.InventoryDTO;
import C2SE._1.Capstone2.dto.MlTrainingDataRowDTO;
import C2SE._1.Capstone2.dto.MlTrainingDataQualityDTO;
import C2SE._1.Capstone2.dto.TaxReportResponseDTO;

import java.time.LocalDate;
import java.util.List;

public interface ReportService {

    List<DailySalesReportDTO> getDailySalesReport(LocalDate date);

    List<DailySalesReportDTO> getDailyOperationalSalesReport(LocalDate date);

    List<DailySalesReportDTO> getHourlySalesReport(LocalDate date);

    List<DailySalesReportDTO> getWeeklySalesReport(LocalDate date);

    List<BestProductDTO> getBestProducts();

    List<InventoryDTO> getLowStockReport();

    TaxReportResponseDTO getTaxReport(LocalDate fromDate, LocalDate toDate);

    List<MlTrainingDataRowDTO> getMlTrainingData(LocalDate fromDate, LocalDate toDate, Integer areaDensityScore);

    MlTrainingDataQualityDTO getMlTrainingDataQuality(LocalDate fromDate, LocalDate toDate, Integer areaDensityScore);
}
