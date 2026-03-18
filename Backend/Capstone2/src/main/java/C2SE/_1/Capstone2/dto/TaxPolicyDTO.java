package C2SE._1.Capstone2.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaxPolicyDTO {
    private BigDecimal vatRatePercent;
    private boolean priceIncludesVat;
}
