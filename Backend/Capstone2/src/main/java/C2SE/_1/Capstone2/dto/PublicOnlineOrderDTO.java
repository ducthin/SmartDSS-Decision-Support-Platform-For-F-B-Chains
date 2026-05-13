package C2SE._1.Capstone2.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class PublicOnlineOrderDTO {
    @NotBlank(message = "Vui lòng nhập họ tên")
    @Size(max = 120, message = "Họ tên tối đa 120 ký tự")
    private String customerName;

    @NotBlank(message = "Vui lòng nhập số điện thoại")
    @Size(max = 20, message = "Số điện thoại không hợp lệ")
    @Pattern(regexp = "^[+0-9][0-9]{8,19}$", message = "Số điện thoại không hợp lệ")
    private String customerPhone;

    @NotBlank(message = "Vui lòng nhập địa chỉ giao hàng")
    @Size(max = 300, message = "Địa chỉ giao hàng tối đa 300 ký tự")
    private String deliveryAddress;

    @Size(max = 64, message = "Mã voucher tối đa 64 ký tự")
    private String voucherCode;

    @Size(max = 500, message = "Ghi chú không được vượt quá 500 ký tự")
    private String note;

    @NotEmpty(message = "Đơn hàng phải có ít nhất 1 món")
    @Size(max = 20, message = "Đơn hàng không được vượt quá 20 món")
    @Valid
    private List<OrderItemDTO> orderItems;
}
