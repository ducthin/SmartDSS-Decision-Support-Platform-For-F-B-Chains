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
public class InventoryMarketPriceDTO {
    private Long inventoryId;
    private Long ingredientId;
    private String ingredientName;
    private String unit;

    private BigDecimal unitCost;
    private BigDecimal marketUnitPrice;
    private String marketPriceSource;
    private LocalDateTime marketPriceUpdatedAt;
}
