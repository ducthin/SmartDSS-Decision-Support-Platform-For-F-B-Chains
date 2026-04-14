package C2SE._1.Capstone2.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderDTO {
    private Long id;
    private String status;
    private BigDecimal totalAmount;
    private String note;
    private String tableNumber;
    /**
     * Đơn QR: mã phiên thiết bị. Luôn xuất hiện trong JSON (kể cả null) để client lọc đúng.
     */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    private String qrClientSessionId;
    private Long createdById;
    private String createdByName;

    @NotEmpty(message = "Đơn hàng phải có ít nhất 1 món")
    @Valid
    private List<OrderItemDTO> orderItems;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
