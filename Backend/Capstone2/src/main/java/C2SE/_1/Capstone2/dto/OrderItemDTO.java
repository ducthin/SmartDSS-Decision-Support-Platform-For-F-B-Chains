package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemDTO {
    private Long id;

    @NotNull(message = "Món ăn không được để trống")
    private Long menuItemId;

    private String menuItemName;

    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng phải >= 1")
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal subtotal;
}
