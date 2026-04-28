package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
public class PublicTableBookingRequestDTO {

    @NotBlank(message = "Vui lòng nhập họ tên")
    @Size(max = 120, message = "Họ tên tối đa 120 ký tự")
    private String customerName;

    @NotBlank(message = "Vui lòng nhập số điện thoại")
    @Size(max = 30, message = "Số điện thoại không hợp lệ")
    private String customerPhone;

    @NotNull(message = "Vui lòng chọn ngày đặt bàn")
    private LocalDate bookingDate;

    @NotNull(message = "Vui lòng chọn giờ đặt bàn")
    private LocalTime bookingTime;

    @NotNull(message = "Vui lòng nhập số khách")
    @Min(value = 1, message = "Số khách phải từ 1 trở lên")
    @Max(value = 30, message = "Số khách tối đa là 30")
    private Integer guestCount;

    @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự")
    private String note;
}
