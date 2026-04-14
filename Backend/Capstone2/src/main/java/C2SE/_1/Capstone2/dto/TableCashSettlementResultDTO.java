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
public class TableCashSettlementResultDTO {
    private String tableNumber;
    private int settledCount;
    private List<Long> settledOrderIds;
    private BigDecimal settledTotalAmount;
    private LocalDateTime paidAt;
}
