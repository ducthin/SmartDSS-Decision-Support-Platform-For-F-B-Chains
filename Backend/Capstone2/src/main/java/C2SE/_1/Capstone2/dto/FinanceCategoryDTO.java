package C2SE._1.Capstone2.dto;

import C2SE._1.Capstone2.entity.FinanceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinanceCategoryDTO {
    private Long id;
    private String name;
    private FinanceType type;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
