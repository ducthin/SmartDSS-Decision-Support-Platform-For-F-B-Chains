package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HolidayCalendarDTO {
    private Long id;

    @NotBlank(message = "Tên ngày lễ không được để trống")
    @Size(max = 200, message = "Tên ngày lễ tối đa 200 ký tự")
    private String name;

    @NotNull(message = "Ngày lễ không được để trống")
    private LocalDate holidayDate;

    @NotNull(message = "Loại ngày lễ không được để trống")
    private String holidayType;

    private Boolean recurring;

    @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
    private String description;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
