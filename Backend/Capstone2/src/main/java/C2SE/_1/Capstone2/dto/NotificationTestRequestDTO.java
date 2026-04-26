package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class NotificationTestRequestDTO {

    @NotBlank(message = "Số điện thoại không được để trống")
    private String phone;

    private String message;
}
