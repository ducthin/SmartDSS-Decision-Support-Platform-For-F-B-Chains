package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QrFeedbackDTO {
    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 120, message = "Họ tên tối đa 120 ký tự")
    private String customerName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Size(max = 30, message = "Số điện thoại không hợp lệ")
    private String customerPhone;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    @Size(max = 120, message = "Email tối đa 120 ký tự")
    private String customerEmail;

    @NotNull(message = "Vui lòng chọn số sao")
    @Min(value = 1, message = "Số sao tối thiểu là 1")
    @Max(value = 5, message = "Số sao tối đa là 5")
    private Integer rating;

    @NotBlank(message = "Nội dung feedback không được để trống")
    @Size(max = 2000, message = "Nội dung tối đa 2000 ký tự")
    private String content;

    private List<MultipartFile> images;
}
