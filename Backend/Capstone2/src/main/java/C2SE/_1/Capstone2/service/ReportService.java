package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.BestProductDTO;
import C2SE._1.Capstone2.dto.DailySalesReportDTO;
import C2SE._1.Capstone2.dto.InventoryDTO;

import java.util.List;

public interface ReportService {

    List<DailySalesReportDTO> getDailySalesReport();

    List<DailySalesReportDTO> getWeeklySalesReport();

    List<BestProductDTO> getBestProducts();

    List<InventoryDTO> getLowStockReport();
}
