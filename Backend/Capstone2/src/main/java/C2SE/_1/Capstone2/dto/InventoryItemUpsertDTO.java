package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryItemUpsertDTO {
    @NotBlank(message = "Tên nguyên liệu không được để trống")
    private String ingredientName;

    @NotBlank(message = "Đơn vị không được để trống")
    private String unit;

    @NotNull(message = "Số lượng tồn kho không được để trống")
    @DecimalMin(value = "0", message = "Số lượng tồn kho phải >= 0")
    private BigDecimal quantity;

    @NotNull(message = "Mức tối thiểu không được để trống")
    @DecimalMin(value = "0", message = "Mức tối thiểu phải >= 0")
    private BigDecimal minimumStock;

    @DecimalMin(value = "0", message = "Đơn giá nội bộ phải >= 0")
    private BigDecimal unitCost;

    @DecimalMin(value = "0", message = "Giá thị trường phải >= 0")
    private BigDecimal marketUnitPrice;

    private String marketPriceSource;
}
