package C2SE._1.Capstone2.dto;

import C2SE._1.Capstone2.entity.BookingStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateTableBookingStatusDTO {
    @NotNull(message = "Vui lòng chọn trạng thái")
    private BookingStatus status;
}
