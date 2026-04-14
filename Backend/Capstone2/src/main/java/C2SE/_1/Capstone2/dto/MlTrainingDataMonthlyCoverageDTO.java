package C2SE._1.Capstone2.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MlTrainingDataMonthlyCoverageDTO {
    private String yearMonth;
    private LocalDate fromDate;
    private LocalDate toDate;
    private Long expectedDays;
    private Long rows;
    private Double coverageRatePct;
    private BigDecimal totalRevenue;
    private Long totalOrders;
}