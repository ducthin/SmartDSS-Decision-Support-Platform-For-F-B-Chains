package C2SE._1.Capstone2.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftRevenueTransactionDTO {
    private Long salesTransactionId;
    private Long orderId;
    private LocalDateTime paidAt;
    private String paymentMethod;
    private String cashierName;
    private String tableNumber;
    private String customerPhone;
    private String voucherCode;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
}
