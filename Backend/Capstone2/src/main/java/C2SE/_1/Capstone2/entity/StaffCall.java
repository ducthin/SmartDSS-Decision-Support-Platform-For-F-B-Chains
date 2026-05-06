package C2SE._1.Capstone2.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "staff_calls")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class StaffCall extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String tableName;

    @Column(length = 500)
    private String message;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private StaffCallPriority priority;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private StaffCallStatus status;

    public enum StaffCallPriority {
        NORMAL,
        URGENT
    }

    public enum StaffCallStatus {
        PENDING,
        ACCEPTED,
        COMPLETED,
        CANCELLED
    }
}

