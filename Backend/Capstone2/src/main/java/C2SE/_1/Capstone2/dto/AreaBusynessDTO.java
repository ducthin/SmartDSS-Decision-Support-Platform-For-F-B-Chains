package C2SE._1.Capstone2.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AreaBusynessDTO {
    private String level;
    private Integer score;
    private Integer poiCount;
    private Integer foodCount;
    private Integer transitCount;
    private Integer commerceCount;
    private Integer educationCount;
    private Double latitude;
    private Double longitude;
    private String address;
    private String recommendation;
    private String source;
    private String sourceType;
    private LocalDateTime analyzedAt;
}
