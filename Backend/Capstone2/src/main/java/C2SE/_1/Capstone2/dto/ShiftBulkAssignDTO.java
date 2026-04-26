package C2SE._1.Capstone2.dto;

import C2SE._1.Capstone2.entity.ShiftType;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftBulkAssignDTO {

    @NotNull(message = "Mẫu ca không được để trống")
    private Long shiftTemplateId;

    @NotEmpty(message = "Danh sách nhân viên không được rỗng")
    private List<Long> userIds;

    @NotEmpty(message = "Danh sách ngày làm không được rỗng")
    private List<LocalDate> shiftDates;

    private ShiftType shiftType;

    private String note;
}
