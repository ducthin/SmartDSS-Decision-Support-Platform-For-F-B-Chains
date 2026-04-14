package C2SE._1.Capstone2.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MlTrainingDataOutlierStatsDTO {
    private Long samples;
    private Double q1;
    private Double q3;
    private Double iqr;
    private Double lowerFence;
    private Double upperFence;
    private Long outlierCount;
    private Double outlierRatePct;
}