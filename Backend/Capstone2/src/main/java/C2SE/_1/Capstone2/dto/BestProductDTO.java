package C2SE._1.Capstone2.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BestProductDTO {
    private Long menuItemId;
    private String menuItemName;
    private Long totalQuantitySold;
    private BigDecimal totalRevenue;
}
