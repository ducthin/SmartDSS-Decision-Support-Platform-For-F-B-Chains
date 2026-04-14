package C2SE._1.Capstone2.dto;

import C2SE._1.Capstone2.entity.FinanceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinanceTransactionDTO {
    private Long id;
    private Long categoryId;
    private String categoryName;
    private FinanceType type;
    private BigDecimal amount;
    private LocalDateTime occurredAt;
    private String note;
    private String sourceType;
    private String sourceRefId;
    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
