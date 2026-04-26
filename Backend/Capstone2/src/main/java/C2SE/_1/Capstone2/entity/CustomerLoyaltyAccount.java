package C2SE._1.Capstone2.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "customer_loyalty_accounts", uniqueConstraints = @UniqueConstraint(columnNames = {"phone"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CustomerLoyaltyAccount extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String phone;

    @Builder.Default
    @Column(name = "points_balance", nullable = false)
    private Integer pointsBalance = 0;

    @Builder.Default
    @Column(name = "total_points_earned", nullable = false)
    private Integer totalPointsEarned = 0;

    @Builder.Default
    @Column(name = "total_orders", nullable = false)
    private Integer totalOrders = 0;

    @Builder.Default
    @Column(name = "total_spent", precision = 12, scale = 2)
    private BigDecimal totalSpent = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "tier", nullable = false, length = 20)
    private String tier = "DONG";

    @Builder.Default
    @Column(name = "monthly_order_count", nullable = false)
    private Integer monthlyOrderCount = 0;

    @Builder.Default
    @Column(name = "monthly_spent", precision = 12, scale = 2)
    private BigDecimal monthlySpent = BigDecimal.ZERO;

    @Column(name = "last_order_at")
    private LocalDateTime lastOrderAt;
}
