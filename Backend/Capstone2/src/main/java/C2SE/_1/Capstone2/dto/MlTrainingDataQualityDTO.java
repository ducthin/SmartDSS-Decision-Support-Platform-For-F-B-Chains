package C2SE._1.Capstone2.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MlTrainingDataQualityDTO {
    private LocalDate fromDate;
    private LocalDate toDate;
    private Long expectedDays;
    private Long totalRows;
    private Double datasetCoverageRatePct;
    private Map<String, Long> missingCountByField;
    private Map<String, Double> missingRatePctByField;
    private Map<String, MlTrainingDataOutlierStatsDTO> outlierStatsByField;
    private List<MlTrainingDataMonthlyCoverageDTO> monthlyCoverage;
}