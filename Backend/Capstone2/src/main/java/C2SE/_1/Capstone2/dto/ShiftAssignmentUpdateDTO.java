package C2SE._1.Capstone2.dto;

import C2SE._1.Capstone2.entity.ShiftType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftAssignmentUpdateDTO {
    private Long userId;
    private Long shiftTemplateId;
    private LocalDate shiftDate;
    private ShiftType shiftType;
    private String status;
    private String note;
}
