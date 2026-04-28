package C2SE._1.Capstone2.dto;

import C2SE._1.Capstone2.entity.BookingStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@Builder
public class TableBookingDTO {
    private Long id;
    private String customerName;
    private String customerPhone;
    private LocalDate bookingDate;
    private LocalTime bookingTime;
    private Integer guestCount;
    private String note;
    private BookingStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
