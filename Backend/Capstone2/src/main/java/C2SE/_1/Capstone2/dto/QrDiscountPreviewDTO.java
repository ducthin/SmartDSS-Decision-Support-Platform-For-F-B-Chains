package C2SE._1.Capstone2.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class QrDiscountPreviewDTO {
    private BigDecimal subtotalAmount;
    private BigDecimal calendarDiscountPercent;
    private String calendarDiscountLabel;
    private BigDecimal calendarDiscountAmount;
    private BigDecimal voucherDiscountAmount;
    private BigDecimal totalDiscountAmount;
    private BigDecimal finalAmount;
    private String voucherCode;
    private String voucherError;
    private String promotionNote;
}
