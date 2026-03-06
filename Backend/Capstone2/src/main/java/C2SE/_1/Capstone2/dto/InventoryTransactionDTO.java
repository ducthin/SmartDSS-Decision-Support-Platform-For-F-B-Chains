package C2SE._1.Capstone2.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryTransactionDTO {
    private Long inventoryId;
    private BigDecimal quantity;
    private String reason;
}
