package C2SE._1.Capstone2.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffCallDTO {
    private Long id;
    private String tableName;
    private String message;
    private LocalDateTime createdAt;
}

