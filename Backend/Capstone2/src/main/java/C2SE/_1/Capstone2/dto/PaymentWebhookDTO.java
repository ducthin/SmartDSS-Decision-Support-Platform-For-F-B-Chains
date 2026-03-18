package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentWebhookDTO {
    @NotNull(message = "orderId is required")
    private Long orderId;

    @NotBlank(message = "status is required")
    private String status; // PAID | FAILED | CANCELLED

    private BigDecimal amount;
    private String transferContent;
    private String providerTransactionId;
}
