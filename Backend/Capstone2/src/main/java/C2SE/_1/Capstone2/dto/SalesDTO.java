package C2SE._1.Capstone2.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesDTO {
    private Long id;
    private Long orderId;
    private BigDecimal netAmount;
    private BigDecimal vatRate;
    private BigDecimal vatAmount;
    private BigDecimal totalAmount;
    private String paymentMethod;
    private String providerTransactionId;
    private LocalDateTime paidAt;
    private Long cashierId;
    private String cashierName;
    private List<SalesItemDTO> salesItems;
    private LocalDateTime createdAt;
}
