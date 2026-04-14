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
public class InventoryMarketPriceUpdateDTO {

    @NotNull(message = "Giá thị trường không được để trống")
    @DecimalMin(value = "0", message = "Giá thị trường phải >= 0")
    private BigDecimal marketUnitPrice;

    private String source;
}
