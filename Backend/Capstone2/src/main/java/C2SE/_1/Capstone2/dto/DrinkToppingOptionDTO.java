package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DrinkToppingOptionDTO {

    @NotBlank(message = "Mã topping không được để trống")
    private String code;

    @NotBlank(message = "Tên topping không được để trống")
    private String label;

    @NotNull(message = "Giá topping không được để trống")
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;
}
