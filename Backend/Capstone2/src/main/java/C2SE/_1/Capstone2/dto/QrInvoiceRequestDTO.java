package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class QrInvoiceRequestDTO {

    @NotNull(message = "Mã đơn không được để trống")
    private Long orderId;

    @NotBlank(message = "Phiên QR không được để trống")
    private String clientSessionId;

    @NotBlank(message = "Cách nhận hóa đơn không được để trống")
    private String deliveryMethod;

    @NotBlank(message = "Mã số thuế không được để trống")
    private String taxCode;

    @NotBlank(message = "Tên công ty không được để trống")
    private String companyName;

    @NotBlank(message = "Địa chỉ không được để trống")
    private String address;

    @Email(message = "Email không hợp lệ")
    @NotBlank(message = "Email không được để trống")
    private String email;

    @NotBlank(message = "Số điện thoại không được để trống")
    private String phone;
}
