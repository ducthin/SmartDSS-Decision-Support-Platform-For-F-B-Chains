package C2SE._1.Capstone2.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackStatsDTO {
    private long total;
    private long newCount;
    private long inReviewCount;
    private long resolvedCount;
    private long lowRatingCount;
    private long todayCount;
    private double averageRating;
}
