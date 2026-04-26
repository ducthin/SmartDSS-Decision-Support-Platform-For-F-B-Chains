package C2SE._1.Capstone2.dto;

import C2SE._1.Capstone2.entity.ShiftType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftAttendanceDTO {
    private Long id;
    private Long assignmentId;
    private Long userId;
    private String userFullName;
    private String shiftTemplateName;
    private ShiftType shiftType;
    private LocalDate shiftDate;
    private String status;

    private LocalDateTime scheduledStartAt;
    private LocalDateTime scheduledEndAt;
    private LocalDateTime checkInAt;
    private LocalDateTime checkOutAt;
    private String checkInSource;
    private String checkOutSource;

    private Long workedMinutes;
    private Long lateMinutes;
    private Long earlyLeaveMinutes;
}
