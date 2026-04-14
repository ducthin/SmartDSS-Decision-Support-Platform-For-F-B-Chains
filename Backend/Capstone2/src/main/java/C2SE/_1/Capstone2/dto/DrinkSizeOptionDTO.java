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
public class DrinkSizeOptionDTO {

    @NotBlank(message = "Mã size không được để trống")
    private String code;

    @NotBlank(message = "Tên size không được để trống")
    private String label;

    @NotNull(message = "Phụ phí size không được để trống")
    @Builder.Default
    private BigDecimal priceExtra = BigDecimal.ZERO;
}
