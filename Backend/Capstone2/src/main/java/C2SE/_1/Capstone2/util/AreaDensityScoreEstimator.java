package C2SE._1.Capstone2.util;

import java.time.LocalDate;

public final class AreaDensityScoreEstimator {

    private static final int[] MONTH_ADJUSTMENTS = {-4, 0, 3, 8, 10, 12, 10, 6, -4, -8, -5, 4};
    private static final int[] DAY_OF_WEEK_ADJUSTMENTS = {-4, -2, 0, 1, 3, 6, 4};

    private AreaDensityScoreEstimator() {
    }

    public static int estimate(int baseScore, LocalDate date, int isHoliday, int eventImpactLevel) {
        int monthAdjust = MONTH_ADJUSTMENTS[date.getMonthValue() - 1];
        int dowAdjust = DAY_OF_WEEK_ADJUSTMENTS[date.getDayOfWeek().getValue() - 1];
        int holidayAdjust = isHoliday == 1 ? 8 : 0;
        int eventAdjust = switch (normalizeImpactLevel(eventImpactLevel)) {
            case 4 -> 12;
            case 3 -> 8;
            case 2 -> 4;
            default -> 0;
        };

        return clamp(baseScore + monthAdjust + dowAdjust + holidayAdjust + eventAdjust, 0, 300);
    }

    public static int normalizeBaseScore(Integer score, int fallbackScore) {
        if (score == null) {
            return clamp(fallbackScore, 0, 300);
        }
        return clamp(score, 0, 300);
    }

    public static int normalizeImpactLevel(int level) {
        return clamp(level, 1, 4);
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}