package C2SE._1.Capstone2.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemDTO {
    private Long id;

    @NotNull(message = "Món ăn không được để trống")
    private Long menuItemId;

    private String menuItemName;

    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng phải >= 1")
    @Max(value = 99, message = "Số lượng không được vượt quá 99")
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal subtotal;

    /** Required when ordering a drink ({@code MenuItem.drink}). */
    private String selectedSizeCode;

    /** Filled by server when returning orders. */
    private String selectedSizeLabel;

    /** Sent by client when placing order; ignored on response. */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private List<String> selectedToppingCodes;

    /** Returned to client; not sent when creating an order. */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private List<OrderToppingLineDTO> selectedToppings;
}
