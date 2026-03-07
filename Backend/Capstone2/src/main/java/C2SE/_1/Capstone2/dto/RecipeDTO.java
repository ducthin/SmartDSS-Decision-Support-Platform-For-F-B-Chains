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
public class RecipeDTO {
    private Long id;

    @NotNull(message = "Món ăn không được để trống")
    private Long menuItemId;

    private String menuItemName;

    @NotNull(message = "Nguyên liệu không được để trống")
    private Long ingredientId;

    private String ingredientName;
    private String ingredientUnit;

    @NotNull(message = "Định lượng không được để trống")
    @DecimalMin(value = "0.01", message = "Định lượng phải > 0")
    private BigDecimal quantity;
}
