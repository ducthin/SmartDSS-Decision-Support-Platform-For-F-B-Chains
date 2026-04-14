package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.DecimalMin;
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
public class InventoryUnitCostUpdateDTO {

    @NotNull(message = "Giá vốn nội bộ không được để trống")
    @DecimalMin(value = "0", message = "Giá vốn nội bộ phải >= 0")
    private BigDecimal unitCost;
}
