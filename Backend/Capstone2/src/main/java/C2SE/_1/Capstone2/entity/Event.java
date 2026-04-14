package C2SE._1.Capstone2.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;

@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Event extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 1000)
    private String description;

    @Column(name = "event_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private EventType eventType;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(length = 200)
    private String location;

    @Column(name = "expected_impact", length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ImpactLevel expectedImpact = ImpactLevel.MEDIUM;

    @Column(length = 500)
    private String notes;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    public enum EventType {
        FESTIVAL, HOLIDAY, CONCERT, SPORT, PROMOTION, CONFERENCE, OTHER
    }

    public enum ImpactLevel {
        LOW, MEDIUM, HIGH, CRITICAL
    }
}
