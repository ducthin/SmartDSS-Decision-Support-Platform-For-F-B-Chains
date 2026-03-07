package C2SE._1.Capstone2.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;

@Entity
@Table(name = "weather_data", uniqueConstraints = @UniqueConstraint(columnNames = "record_date"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WeatherData extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @Column(nullable = false)
    private Double temperature;

    @Column(name = "feels_like")
    private Double feelsLike;

    @Column(nullable = false)
    private Integer humidity;

    @Column(name = "weather_condition", length = 50)
    private String condition;

    @Column(length = 100)
    private String description;

    @Column(length = 10)
    private String icon;

    @Column(name = "wind_speed")
    private Double windSpeed;

    private Double rainfall;

    @Column(length = 100)
    private String city;
}
