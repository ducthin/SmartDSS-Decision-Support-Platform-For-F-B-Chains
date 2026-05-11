package C2SE._1.Capstone2.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "holiday_calendar", uniqueConstraints = @UniqueConstraint(columnNames = {"holiday_date", "name"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class HolidayCalendar extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "holiday_date", nullable = false)
    private LocalDate holidayDate;

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private HolidayType holidayType;

    @Column(name = "is_recurring")
    @Builder.Default
    private Boolean recurring = false;

    @Column(length = 500)
    private String description;

    @Builder.Default
    @Column(name = "discount_percent", precision = 5, scale = 2)
    private BigDecimal discountPercent = BigDecimal.ZERO;

    @Column(name = "is_open_on_holiday")
    @Builder.Default
    private Boolean openOnHoliday = false;

    @Column(name = "override_start_time")
    private LocalTime overrideStartTime;

    @Column(name = "override_end_time")
    private LocalTime overrideEndTime;

    @Column(name = "special_notes", length = 500)
    private String specialNotes;

    public enum HolidayType {
        PUBLIC_HOLIDAY, CULTURAL, RELIGIOUS, SCHOOL, COMPANY, OTHER
    }
}
