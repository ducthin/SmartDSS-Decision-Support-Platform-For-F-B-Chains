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
public class TaxReportItemDTO {
    private String date;
    private Long totalOrders;
    private BigDecimal netAmount;
    private BigDecimal vatAmount;
    private BigDecimal totalAmount;
}
