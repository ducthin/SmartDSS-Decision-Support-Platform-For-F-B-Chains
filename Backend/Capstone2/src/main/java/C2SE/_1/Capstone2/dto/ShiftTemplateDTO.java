package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftTemplateDTO {
    private Long id;

    @NotBlank(message = "Tên ca không được để trống")
    private String name;

    @NotNull(message = "Giờ bắt đầu không được để trống")
    private LocalTime startTime;

    @NotNull(message = "Giờ kết thúc không được để trống")
    private LocalTime endTime;

    @Min(value = 0, message = "Thời gian nghỉ không hợp lệ")
    @Max(value = 240, message = "Thời gian nghỉ tối đa 240 phút")
    private Integer breakMinutes;

    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
