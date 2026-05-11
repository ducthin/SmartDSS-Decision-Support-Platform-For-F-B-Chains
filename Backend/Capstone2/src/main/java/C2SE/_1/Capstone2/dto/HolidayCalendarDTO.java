package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

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

    @DecimalMin(value = "0.0", message = "Giảm giá phải >= 0%")
    @DecimalMax(value = "100.0", message = "Giảm giá tối đa 100%")
    private BigDecimal discountPercent;

    private Boolean openOnHoliday;

    private LocalTime overrideStartTime;

    private LocalTime overrideEndTime;

    @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
    private String specialNotes;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
