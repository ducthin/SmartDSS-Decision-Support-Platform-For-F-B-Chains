package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.AreaBusynessDTO;
import C2SE._1.Capstone2.dto.StoreLocationDTO;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.service.AreaBusynessService;
import C2SE._1.Capstone2.service.StoreLocationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class AreaBusynessServiceImpl implements AreaBusynessService {
    private static final String SOURCE_REALTIME = "REALTIME";
    private static final String SOURCE_CACHE = "CACHE";
    private static final String SOURCE_FALLBACK = "FALLBACK";

    private static final long DEFAULT_TIMEOUT_MS = 5000;
    private static final long DEFAULT_CIRCUIT_OPEN_SECONDS = 120;
    private static final int CIRCUIT_THRESHOLD = 3;

    private final StoreLocationService storeLocationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${area.busyness.overpass-url:https://overpass-api.de/api/interpreter}")
    private String overpassUrl;

    @Value("${area.busyness.radius-meters:800}")
    private int radiusMeters;

    @Value("${area.busyness.cache-seconds:600}")
    private long cacheSeconds;

    @Value("${area.busyness.request-timeout-ms:5000}")
    private long requestTimeoutMs;

    @Value("${area.busyness.retry-max-attempts:2}")
    private int retryMaxAttempts;

    @Value("${area.busyness.retry-backoff-ms:600}")
    private long retryBackoffMs;

    @Value("${area.busyness.circuit-open-seconds:120}")
    private long circuitOpenSeconds;

    private volatile AreaBusynessDTO cachedResult;
    private volatile LocalDateTime cachedAt;
    private volatile Double cachedLatitude;
    private volatile Double cachedLongitude;
    private volatile int consecutiveFailures = 0;
    private volatile LocalDateTime circuitOpenedAt;

    @Override
    public AreaBusynessDTO analyzeCurrentArea() {
        StoreLocationDTO location = storeLocationService.getStoreLocation();
        if (location.getLatitude() == null || location.getLongitude() == null) {
            throw new BadRequestException("Chưa cấu hình vị trí quán. Hãy cập nhật vĩ độ/kinh độ trong Cài đặt.");
        }

        AreaBusynessDTO quickCacheHit = getCachedIfValid(location);
        if (quickCacheHit != null) {
            return quickCacheHit;
        }

        if (isCircuitOpen()) {
            return buildFallbackResult(location, "Fallback (circuit-open)");
        }

        try {
            String query = buildOverpassQuery(location.getLatitude(), location.getLongitude());
            String json = fetchOverpassWithRetry(query);

            JsonNode root = objectMapper.readTree(json);
            if (!root.has("elements")) {
                throw new IllegalStateException("Overpass response missing elements");
            }
            JsonNode elements = root.path("elements");

            int poiCount = 0;
            int foodCount = 0;
            int transitCount = 0;
            int commerceCount = 0;
            int educationCount = 0;

            if (elements.isArray()) {
                for (JsonNode element : elements) {
                    JsonNode tags = element.path("tags");
                    if (!tags.isObject()) continue;
                    poiCount++;

                    String amenity = text(tags, "amenity");
                    String shop = text(tags, "shop");
                    String highway = text(tags, "highway");
                    String railway = text(tags, "railway");
                    String publicTransport = text(tags, "public_transport");

                    if (isFood(amenity)) foodCount++;
                    if (isTransit(amenity, highway, railway, publicTransport)) transitCount++;
                    if (!shop.isBlank() || isCommerceAmenity(amenity)) commerceCount++;
                    if (isEducationAmenity(amenity)) educationCount++;
                }
            }

            int score = foodCount * 3 + transitCount * 4 + commerceCount + educationCount * 2;
            String level = classifyLevel(score);

            AreaBusynessDTO dto = AreaBusynessDTO.builder()
                    .level(level)
                    .score(score)
                    .poiCount(poiCount)
                    .foodCount(foodCount)
                    .transitCount(transitCount)
                    .commerceCount(commerceCount)
                    .educationCount(educationCount)
                    .latitude(location.getLatitude())
                    .longitude(location.getLongitude())
                    .address(location.getAddress())
                    .recommendation(recommendation(level))
                    .source("OpenStreetMap/Overpass")
                    .sourceType(SOURCE_REALTIME)
                    .analyzedAt(LocalDateTime.now())
                    .build();

            updateCache(location, dto);
            resetFailureState();
            return dto;
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to analyze area busyness. type={}, message={}",
                    e.getClass().getSimpleName(), e.getMessage(), e);
            recordFailure();
            return buildFallbackResult(location, "Fallback (provider-unavailable)");
        }
    }

    private String buildOverpassQuery(double lat, double lon) {
        return "[out:json][timeout:25];"
                + "("
                + "nwr(around:" + radiusMeters + "," + lat + "," + lon + ")[\"amenity\"];"
                + "nwr(around:" + radiusMeters + "," + lat + "," + lon + ")[\"shop\"];"
                + "nwr(around:" + radiusMeters + "," + lat + "," + lon + ")[\"public_transport\"];"
                + "nwr(around:" + radiusMeters + "," + lat + "," + lon + ")[\"highway\"=\"bus_stop\"];"
                + "nwr(around:" + radiusMeters + "," + lat + "," + lon + ")[\"railway\"~\"station|tram_stop|subway_entrance\"];"
                + ");out tags center;";
    }

    private static String classifyLevel(int score) {
        if (score >= 120) return "DONG_DUC";
        if (score >= 60) return "TRUNG_BINH";
        return "IT_DONG";
    }

    private static String recommendation(String level) {
        return switch (level) {
            case "DONG_DUC" -> "Khu vực có mật độ cao: ưu tiên chuẩn bị thêm nhân sự giờ cao điểm và tăng tồn kho nhóm bán chạy.";
            case "TRUNG_BINH" -> "Khu vực mật độ trung bình: nên giữ lịch vận hành linh hoạt và theo dõi doanh thu theo khung giờ.";
            default -> "Khu vực thưa hơn: cân nhắc đẩy ưu đãi theo khung giờ và tối ưu chi phí nhân sự ca thấp điểm.";
        };
    }

    private static String text(JsonNode tags, String key) {
        return tags.path(key).asText("").trim().toLowerCase();
    }

    private static boolean isFood(String amenity) {
        return amenity.equals("restaurant")
                || amenity.equals("cafe")
                || amenity.equals("fast_food")
                || amenity.equals("food_court")
                || amenity.equals("bar")
                || amenity.equals("marketplace");
    }

    private static boolean isTransit(String amenity, String highway, String railway, String publicTransport) {
        return amenity.equals("bus_station")
                || amenity.equals("ferry_terminal")
                || highway.equals("bus_stop")
                || railway.equals("station")
                || railway.equals("tram_stop")
                || railway.equals("subway_entrance")
                || !publicTransport.isBlank();
    }

    private static boolean isCommerceAmenity(String amenity) {
        return amenity.equals("bank")
                || amenity.equals("atm")
                || amenity.equals("marketplace")
                || amenity.equals("pharmacy")
                || amenity.equals("clinic");
    }

    private static boolean isEducationAmenity(String amenity) {
        return amenity.equals("school")
                || amenity.equals("college")
                || amenity.equals("university");
    }

    private AreaBusynessDTO getCachedIfValid(StoreLocationDTO location) {
        AreaBusynessDTO localCached = cachedResult;
        LocalDateTime localCachedAt = cachedAt;
        if (localCached == null || localCachedAt == null) return null;

        if (!Objects.equals(cachedLatitude, location.getLatitude())
                || !Objects.equals(cachedLongitude, location.getLongitude())) {
            return null;
        }

        LocalDateTime expireAt = localCachedAt.plusSeconds(Math.max(cacheSeconds, 0));
        if (expireAt.isBefore(LocalDateTime.now())) return null;
        AreaBusynessDTO dto = cloneDto(localCached);
        dto.setSourceType(SOURCE_CACHE);
        dto.setSource(localCached.getSource() + " (cache)");
        dto.setAnalyzedAt(LocalDateTime.now());
        return dto;
    }

    private synchronized void updateCache(StoreLocationDTO location, AreaBusynessDTO dto) {
        cachedResult = cloneDto(dto);
        cachedAt = LocalDateTime.now();
        cachedLatitude = location.getLatitude();
        cachedLongitude = location.getLongitude();
    }

    private String fetchOverpassWithRetry(String query) throws IOException, InterruptedException {
        // Tổng số lần gọi HTTP (1 = không retry). Phải tôn trọng cấu hình, không ép tối thiểu 2 như trước.
        int attempts = Math.max(1, retryMaxAttempts);
        long backoffMs = Math.max(0L, retryBackoffMs);

        Exception lastException = null;
        for (int attempt = 1; attempt <= attempts; attempt++) {
            try {
                return performOverpassRequest(query);
            } catch (Exception ex) {
                lastException = ex;
                if (attempt == attempts) break;
                Thread.sleep(backoffMs * attempt);
            }
        }

        if (lastException instanceof IOException io) throw io;
        if (lastException instanceof InterruptedException ie) throw ie;
        throw new IOException("Overpass request failed after retries", lastException);
    }

    private String performOverpassRequest(String query) throws IOException, InterruptedException {
        long timeoutMs = Math.max(requestTimeoutMs, DEFAULT_TIMEOUT_MS);
        String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
        URI uri = URI.create(overpassUrl + "?data=" + encodedQuery);

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(timeoutMs))
                .build();
        HttpRequest request = HttpRequest.newBuilder(uri)
                .GET()
                .timeout(Duration.ofMillis(timeoutMs))
                .header("Accept", "application/json")
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IOException("Overpass status=" + response.statusCode());
        }
        return response.body();
    }

    private boolean isCircuitOpen() {
        LocalDateTime openedAt = circuitOpenedAt;
        if (openedAt == null) return false;
        long openSeconds = Math.max(circuitOpenSeconds, DEFAULT_CIRCUIT_OPEN_SECONDS);
        return openedAt.plusSeconds(openSeconds).isAfter(LocalDateTime.now());
    }

    private synchronized void recordFailure() {
        consecutiveFailures++;
        if (consecutiveFailures >= CIRCUIT_THRESHOLD) {
            circuitOpenedAt = LocalDateTime.now();
        }
    }

    private synchronized void resetFailureState() {
        consecutiveFailures = 0;
        circuitOpenedAt = null;
    }

    private AreaBusynessDTO buildFallbackResult(StoreLocationDTO location, String source) {
        if (cachedResult != null) {
            AreaBusynessDTO dto = cloneDto(cachedResult);
            dto.setSource(source + " (using-cache)");
            dto.setSourceType(SOURCE_CACHE);
            dto.setAnalyzedAt(LocalDateTime.now());
            return dto;
        }
        return AreaBusynessDTO.builder()
                .level("TRUNG_BINH")
                .score(0)
                .poiCount(0)
                .foodCount(0)
                .transitCount(0)
                .commerceCount(0)
                .educationCount(0)
                .latitude(location.getLatitude())
                .longitude(location.getLongitude())
                .address(location.getAddress())
                .recommendation("Chưa lấy được dữ liệu khu vực theo thời gian thực. Vị trí quán vẫn đã lưu bình thường, vui lòng thử làm mới lại sau.")
                .source(source)
                .sourceType(SOURCE_FALLBACK)
                .analyzedAt(LocalDateTime.now())
                .build();
    }

    private static AreaBusynessDTO cloneDto(AreaBusynessDTO src) {
        return AreaBusynessDTO.builder()
                .level(src.getLevel())
                .score(src.getScore())
                .poiCount(src.getPoiCount())
                .foodCount(src.getFoodCount())
                .transitCount(src.getTransitCount())
                .commerceCount(src.getCommerceCount())
                .educationCount(src.getEducationCount())
                .latitude(src.getLatitude())
                .longitude(src.getLongitude())
                .address(src.getAddress())
                .recommendation(src.getRecommendation())
                .source(src.getSource())
                .sourceType(src.getSourceType())
                .analyzedAt(src.getAnalyzedAt())
                .build();
    }
}
