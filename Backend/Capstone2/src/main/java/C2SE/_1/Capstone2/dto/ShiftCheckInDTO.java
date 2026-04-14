package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftCheckInDTO {

    @NotNull(message = "Ca làm không được để trống")
    private Long assignmentId;

    private String source;
}
