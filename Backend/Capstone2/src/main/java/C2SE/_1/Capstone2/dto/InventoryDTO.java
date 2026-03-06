package C2SE._1.Capstone2.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryDTO {
    private Long id;
    private Long ingredientId;
    private String ingredientName;
    private String unit;
    private BigDecimal quantity;
    private BigDecimal minimumStock;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
