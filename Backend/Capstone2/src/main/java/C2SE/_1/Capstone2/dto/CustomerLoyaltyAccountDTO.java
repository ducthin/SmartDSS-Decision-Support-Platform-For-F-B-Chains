package C2SE._1.Capstone2.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerLoyaltyAccountDTO {

    private Long id;
    private String phone;
    private Integer pointsBalance;
    private Integer totalPointsEarned;
    private Integer totalOrders;
    private BigDecimal totalSpent;
    private String tier;
    private Integer monthlyOrderCount;
    private BigDecimal monthlySpent;
    private LocalDateTime lastOrderAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
