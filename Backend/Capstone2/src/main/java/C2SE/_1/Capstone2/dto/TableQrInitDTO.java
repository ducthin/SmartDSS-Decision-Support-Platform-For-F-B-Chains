package C2SE._1.Capstone2.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TableQrInitDTO {
    private String tableNumber;
    private Long representativeOrderId;
    private List<Long> includedOrderIds;
    private BigDecimal amount;
    private String transferContent;
    private String qrImageUrl;
    private String qrCode;
    private String checkoutUrl;
    private String provider;
    private LocalDateTime expiresAt;
}
