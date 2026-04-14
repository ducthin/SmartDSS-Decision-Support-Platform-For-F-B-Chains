package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QrStaffCallDTO {

    @Size(max = 500, message = "Tin nhắn tối đa 500 ký tự")
    private String message;
}

