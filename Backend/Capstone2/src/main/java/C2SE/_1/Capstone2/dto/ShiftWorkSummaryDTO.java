package C2SE._1.Capstone2.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftWorkSummaryDTO {
    private Long userId;
    private String userFullName;

    private Long totalAssignments;
    private Long assignedCount;
    private Long checkedInCount;
    private Long completedCount;
    private Long cancelledCount;
    private Long absentCount;

    private Long totalWorkedMinutes;
    private Long totalLateMinutes;
    private Long totalEarlyLeaveMinutes;

    private BigDecimal totalRevenueDuringShift;
    private BigDecimal averageRevenuePerCompletedShift;
    private BigDecimal totalCashierRevenueDuringShift;
}
