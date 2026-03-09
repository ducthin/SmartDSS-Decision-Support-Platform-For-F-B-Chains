package C2SE._1.Capstone2.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QrOrderDTO {
    @Size(max = 500, message = "Ghi chú không được vượt quá 500 ký tự")
    private String note;

    @NotEmpty(message = "Đơn hàng phải có ít nhất 1 món")
    @Size(max = 20, message = "Đơn hàng không được vượt quá 20 món")
    @Valid
    private List<OrderItemDTO> orderItems;
}

