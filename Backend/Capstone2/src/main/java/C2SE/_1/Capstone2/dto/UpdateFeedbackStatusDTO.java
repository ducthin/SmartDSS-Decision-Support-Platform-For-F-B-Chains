package C2SE._1.Capstone2.dto;

import C2SE._1.Capstone2.entity.FeedbackStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateFeedbackStatusDTO {
    @NotNull(message = "Trạng thái không được để trống")
    private FeedbackStatus status;

    @Size(max = 1000, message = "Ghi chú nội bộ tối đa 1000 ký tự")
    private String internalNote;
}
