package C2SE._1.Capstone2.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CashClosingDTO {
    private Long id;
    private LocalDate businessDate;
    private BigDecimal openingBalance;
    private BigDecimal totalInflow;
    private BigDecimal totalOutflow;
    private BigDecimal expectedBalance;
    private BigDecimal actualBalance;
    private BigDecimal variance;
    private String note;
    private Long closedById;
    private String closedByName;
    private LocalDateTime closedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
