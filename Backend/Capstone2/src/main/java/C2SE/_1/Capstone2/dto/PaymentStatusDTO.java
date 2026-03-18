package C2SE._1.Capstone2.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentStatusDTO {
    private Long orderId;
    private String status; // PENDING | PAID
    private String paymentMethod; // CASH | QR | PENDING
}
