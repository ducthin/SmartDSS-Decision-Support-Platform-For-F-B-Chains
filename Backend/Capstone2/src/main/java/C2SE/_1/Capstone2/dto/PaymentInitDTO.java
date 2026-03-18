package C2SE._1.Capstone2.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentInitDTO {
    private Long orderId;
    private BigDecimal amount;
    private String transferContent;
    private String qrImageUrl;
    private String qrCode;
    private String checkoutUrl;
    private String provider;
    private LocalDateTime expiresAt;
    private PaymentStatusDTO paymentStatus;
}
