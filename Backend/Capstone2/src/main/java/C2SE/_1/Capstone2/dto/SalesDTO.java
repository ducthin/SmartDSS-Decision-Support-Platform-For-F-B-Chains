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
    private BigDecimal totalAmount;
    private String paymentMethod;
    private Long cashierId;
    private String cashierName;
    private List<SalesItemDTO> salesItems;
    private LocalDateTime createdAt;
}
