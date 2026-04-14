package C2SE._1.Capstone2.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackAlertDTO {
    private Long feedbackId;
    private String tableName;
    private String customerName;
    private Integer rating;
    private String content;
    private String level; // HIGH | CRITICAL
    private Long lowRatingCountInWindow;
    private Integer windowMinutes;
    private LocalDateTime createdAt;
}
