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
public class MlTrainingDataRowDTO {
    private LocalDate date;
    private Integer dayOfWeek;
    private Integer isWeekend;
    private Integer isHoliday;
    private String holidayName;
    private Double temperature;
    private Double rainfall;
    private Integer eventImpactLevel;
    private Integer areaDensityScore;
    private BigDecimal sales1DayAgo;
    private BigDecimal sales7DaysAgo;
    private BigDecimal revenue;
    private Long orders;
}