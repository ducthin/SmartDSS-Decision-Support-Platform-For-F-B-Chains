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

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventDTO {
    private Long id;

    @NotBlank(message = "Tên sự kiện không được để trống")
    @Size(max = 200, message = "Tên sự kiện tối đa 200 ký tự")
    private String name;

    @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
    private String description;

    @NotNull(message = "Loại sự kiện không được để trống")
    private String eventType;

    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDate startDate;

    @NotNull(message = "Ngày kết thúc không được để trống")
    private LocalDate endDate;

    @Size(max = 200, message = "Địa điểm tối đa 200 ký tự")
    private String location;

    private String expectedImpact;

    @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
    private String notes;

    @DecimalMin(value = "0.0", message = "Giảm giá phải >= 0%")
    @DecimalMax(value = "100.0", message = "Giảm giá tối đa 100%")
    private BigDecimal discountPercent;

    private Boolean active;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
