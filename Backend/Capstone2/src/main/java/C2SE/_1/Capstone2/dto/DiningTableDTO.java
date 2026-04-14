package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiningTableDTO {
    private Long id;

    @NotBlank(message = "Tên bàn không được để trống")
    @Size(max = 50, message = "Tên bàn tối đa 50 ký tự")
    private String name;

    private String qrToken;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
