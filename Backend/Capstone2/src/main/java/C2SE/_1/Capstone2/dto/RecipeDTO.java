package C2SE._1.Capstone2.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeDTO {
    private Long id;
    private Long menuItemId;
    private String menuItemName;
    private Long ingredientId;
    private String ingredientName;
    private String ingredientUnit;
    private BigDecimal quantity;
}
