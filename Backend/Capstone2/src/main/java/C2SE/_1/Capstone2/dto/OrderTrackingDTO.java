package C2SE._1.Capstone2.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderTrackingDTO {
    private Long orderId;
    private String orderStatus; // PENDING | PREPARING | COMPLETED | CANCELLED
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;

    // From SalesTransaction/payment flow
    private String paymentStatus;  // PENDING | PAID
    private String paymentMethod;  // CASH | QR | PENDING
}

