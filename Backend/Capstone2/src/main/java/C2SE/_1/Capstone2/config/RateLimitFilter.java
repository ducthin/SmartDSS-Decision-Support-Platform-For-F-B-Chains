package C2SE._1.Capstone2.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@Slf4j
public class RateLimitFilter implements Filter {

    private static final int MAX_REQUESTS = 5;
    private static final long WINDOW_MS = 10_000; // 10 giây
    private static final long CLEANUP_THRESHOLD_MS = 300_000; // 5 phút

    private final Map<String, RateBucket> buckets = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest request = (HttpServletRequest) req;
        String path = request.getRequestURI();

        // Chỉ áp dụng rate limit cho public QR endpoints
        if (path.startsWith("/api/v1/public/qr") && "POST".equalsIgnoreCase(request.getMethod())) {
            String clientIp = getClientIp(request);
            RateBucket bucket = buckets.computeIfAbsent(clientIp, k -> new RateBucket());

            if (!bucket.allowRequest()) {
                HttpServletResponse response = (HttpServletResponse) res;
                response.setStatus(429); // Too Many Requests
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write(
                        "{\"success\":false,\"message\":\"Quá nhiều yêu cầu. Vui lòng thử lại sau.\"}");
                return;
            }
        }

        chain.doFilter(req, res);
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isEmpty()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Dọn dẹp các bucket cũ mỗi 5 phút để tránh memory leak.
     */
    @Scheduled(fixedRate = 300_000)
    public void cleanupOldBuckets() {
        long now = System.currentTimeMillis();
        int removed = 0;
        var iterator = buckets.entrySet().iterator();
        while (iterator.hasNext()) {
            var entry = iterator.next();
            if (now - entry.getValue().windowStart > CLEANUP_THRESHOLD_MS) {
                iterator.remove();
                removed++;
            }
        }
        if (removed > 0) {
            log.debug("Cleaned up {} expired rate limit buckets", removed);
        }
    }

    /**
     * Sliding window counter per IP.
     */
    private static class RateBucket {
        private final AtomicInteger count = new AtomicInteger(0);
        private volatile long windowStart = System.currentTimeMillis();

        boolean allowRequest() {
            long now = System.currentTimeMillis();
            if (now - windowStart > WINDOW_MS) {
                // Reset window
                synchronized (this) {
                    if (now - windowStart > WINDOW_MS) {
                        count.set(0);
                        windowStart = now;
                    }
                }
            }
            return count.incrementAndGet() <= MAX_REQUESTS;
        }
    }
}
