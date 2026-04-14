package C2SE._1.Capstone2.dto;

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
public class GrossProfitPointDTO {
    private String period;
    private BigDecimal revenue;
    private BigDecimal cogs;
    private BigDecimal grossProfit;
}
