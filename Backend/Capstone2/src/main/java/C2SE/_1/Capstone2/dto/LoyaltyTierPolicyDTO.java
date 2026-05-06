package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoyaltyTierPolicyDTO {

    @NotNull
    @Min(1)
    private Integer bacMinOrders;

    @NotNull
    @DecimalMin("0.0")
    private BigDecimal bacMinSpent;

    @NotNull
    @DecimalMin("0.0")
    @Max(100)
    private BigDecimal bacDiscountPercent;

    @NotNull
    @DecimalMin("0.0")
    private BigDecimal bacMaxDiscountAmount;

    @NotNull
    @Min(1)
    private Integer vangMinOrders;

    @NotNull
    @DecimalMin("0.0")
    private BigDecimal vangMinSpent;

    @NotNull
    @DecimalMin("0.0")
    @Max(100)
    private BigDecimal vangDiscountPercent;

    @NotNull
    @DecimalMin("0.0")
    private BigDecimal vangMaxDiscountAmount;
}
