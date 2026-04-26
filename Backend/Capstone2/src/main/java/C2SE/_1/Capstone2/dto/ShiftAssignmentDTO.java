package C2SE._1.Capstone2.dto;

import C2SE._1.Capstone2.entity.ShiftType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftAssignmentDTO {
    private Long id;
    private Long userId;
    private String userFullName;
    private Long shiftTemplateId;
    private String shiftTemplateName;
    private ShiftType shiftType;
    private LocalDate shiftDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer breakMinutes;
    private String status;
    private String note;

    private LocalDateTime scheduledStartAt;
    private LocalDateTime scheduledEndAt;
    private LocalDateTime checkInAt;
    private LocalDateTime checkOutAt;
    private Long workedMinutes;
    private Long lateMinutes;
    private Long earlyLeaveMinutes;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
