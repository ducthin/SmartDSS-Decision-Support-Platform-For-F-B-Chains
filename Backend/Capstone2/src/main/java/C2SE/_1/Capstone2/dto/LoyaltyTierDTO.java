package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoyaltyTierDTO {

    @NotBlank(message = "Mã cấp bậc không được để trống")
    @Size(max = 20, message = "Mã cấp bậc tối đa 20 ký tự")
    private String code;

    @NotBlank(message = "Tên cấp bậc không được để trống")
    @Size(max = 80, message = "Tên cấp bậc tối đa 80 ký tự")
    private String name;

    @NotNull
    @Min(1)
    private Integer displayOrder;

    @NotNull
    @Min(0)
    private Integer minOrders;

    @NotNull
    @DecimalMin("0.0")
    private BigDecimal minSpent;

    @Builder.Default
    private Boolean voucherEnabled = false;

    @NotNull
    @DecimalMin("0.0")
    @Max(100)
    private BigDecimal discountPercent;

    @NotNull
    @DecimalMin("0.0")
    private BigDecimal maxDiscountAmount;

    @Builder.Default
    private Boolean active = true;
}
