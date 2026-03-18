package C2SE._1.Capstone2.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerFeedbackDTO {
    private Long id;
    private String tableName;
    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private Integer rating;
    private String content;
    private String imageUrl;
    private List<String> imageUrls;
    private LocalDateTime createdAt;
}
