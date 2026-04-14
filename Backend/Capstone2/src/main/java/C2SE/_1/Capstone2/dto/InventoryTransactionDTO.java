package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryTransactionDTO {
    @NotNull(message = "Mã kho không được để trống")
    private Long inventoryId;

    @NotNull(message = "Số lượng không được để trống")
    @DecimalMin(value = "0.01", message = "Số lượng phải > 0")
    private BigDecimal quantity;

    @DecimalMin(value = "0", message = "Đơn giá phải >= 0")
    private BigDecimal unitPrice;

    private String reason;
}
