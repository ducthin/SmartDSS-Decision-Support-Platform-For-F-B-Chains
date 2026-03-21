package C2SE._1.Capstone2.dto;

import lombok.*;

import java.math.BigDecimal;

/** Snapshot of one topping line saved on an order item (for bill / display). */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderToppingLineDTO {
    private String code;
    private String label;
    private BigDecimal price;
}
