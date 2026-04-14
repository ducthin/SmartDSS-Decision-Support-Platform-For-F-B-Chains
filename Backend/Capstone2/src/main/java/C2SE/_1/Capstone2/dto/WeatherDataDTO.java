package C2SE._1.Capstone2.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WeatherDataDTO {
    private Long id;
    private LocalDate recordDate;
    private Double temperature;
    private Double feelsLike;
    private Integer humidity;
    private String condition;
    private String description;
    private String icon;
    private Double windSpeed;
    private Double rainfall;
    private String city;
    private LocalDateTime createdAt;
}
