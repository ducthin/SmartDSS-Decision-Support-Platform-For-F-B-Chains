package C2SE._1.Capstone2.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * Tiện ích thống nhất timezone Việt Nam (Asia/Ho_Chi_Minh, UTC+7) cho toàn ứng dụng.
 * <p>
 * Tất cả lệnh gọi {@code LocalDateTime.now()} hoặc {@code LocalDate.now()} phải
 * đi qua class này để đảm bảo giờ luôn là giờ Việt Nam, bất kể JVM host chạy ở
 * múi giờ nào (VPS, container Docker…).
 * </p>
 */
public final class TimeUtil {

    /** Múi giờ Việt Nam chuẩn. */
    public static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private TimeUtil() {}

    /** Trả về {@link LocalDateTime} hiện tại theo giờ Việt Nam. */
    public static LocalDateTime nowVN() {
        return ZonedDateTime.now(VN_ZONE).toLocalDateTime();
    }

    /** Trả về {@link LocalDate} hôm nay theo giờ Việt Nam. */
    public static LocalDate todayVN() {
        return LocalDate.now(VN_ZONE);
    }
}
