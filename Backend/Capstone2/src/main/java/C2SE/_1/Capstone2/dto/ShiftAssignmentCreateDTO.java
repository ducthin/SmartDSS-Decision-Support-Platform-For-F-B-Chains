package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.NotNull;
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
public class ShiftAssignmentCreateDTO {

    @NotNull(message = "Nhân viên không được để trống")
    private Long userId;

    @NotNull(message = "Mẫu ca không được để trống")
    private Long shiftTemplateId;

    @NotNull(message = "Ngày làm không được để trống")
    private LocalDate shiftDate;

    private String note;
}
