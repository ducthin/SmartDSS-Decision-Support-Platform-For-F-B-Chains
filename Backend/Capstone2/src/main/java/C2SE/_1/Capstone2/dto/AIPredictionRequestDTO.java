package C2SE._1.Capstone2.dto;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonAutoDetect(
        fieldVisibility = JsonAutoDetect.Visibility.ANY,
        getterVisibility = JsonAutoDetect.Visibility.NONE,
        isGetterVisibility = JsonAutoDetect.Visibility.NONE
)
public class AIPredictionRequestDTO {

    @JsonProperty("temperature")
    private Double temperature;

    @JsonProperty("rainfall")
    private Double rainfall;

    @JsonProperty("is_weekend")
    private Integer isWeekend;

    @JsonProperty("is_holiday")
    private Integer isHoliday;

    @JsonProperty("event_impact_level")
    private Integer eventImpactLevel;

    @JsonProperty("area_density_score")
    private Integer areaDensityScore;

    /** ISO-8601: 1 = Thứ Hai … 7 = Chủ Nhật (khớp Python Pydantic ge=1 le=7). */
    @JsonProperty("day_of_week")
    private Integer dayOfWeek;

    @JsonProperty("sales_1_day_ago")
    private Double sales1DayAgo;

    @JsonProperty("sales_7_days_ago")
    private Double sales7DaysAgo;
}
