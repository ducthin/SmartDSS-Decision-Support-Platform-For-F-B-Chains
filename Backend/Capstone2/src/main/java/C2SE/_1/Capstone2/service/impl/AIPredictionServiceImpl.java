package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.AIPredictionRequestDTO;
import C2SE._1.Capstone2.dto.AIPredictionResponseDTO;
import C2SE._1.Capstone2.dto.AreaBusynessDTO;
import C2SE._1.Capstone2.dto.DailySalesReportDTO;
import C2SE._1.Capstone2.dto.DrinkSizeOptionDTO;
import C2SE._1.Capstone2.dto.EventDTO;
import C2SE._1.Capstone2.dto.InventoryProjectionLineDTO;
import C2SE._1.Capstone2.dto.OrderToppingLineDTO;
import C2SE._1.Capstone2.dto.WeatherDataDTO;
import C2SE._1.Capstone2.entity.Ingredient;
import C2SE._1.Capstone2.entity.Inventory;
import C2SE._1.Capstone2.entity.MenuItem;
import C2SE._1.Capstone2.entity.OrderItem;
import C2SE._1.Capstone2.entity.OrderStatus;
import C2SE._1.Capstone2.exception.AiPredictionException;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.repository.HolidayCalendarRepository;
import C2SE._1.Capstone2.repository.InventoryRepository;
import C2SE._1.Capstone2.repository.MenuItemRepository;
import C2SE._1.Capstone2.repository.OrderItemRepository;
import C2SE._1.Capstone2.repository.RecipeRepository;
import C2SE._1.Capstone2.service.AIPredictionService;
import C2SE._1.Capstone2.service.AreaBusynessService;
import C2SE._1.Capstone2.service.EventService;
import C2SE._1.Capstone2.service.OpenAiComparisonService;
import C2SE._1.Capstone2.service.ReportService;
import C2SE._1.Capstone2.service.WeatherService;
import C2SE._1.Capstone2.util.AreaDensityScoreEstimator;
import C2SE._1.Capstone2.util.DrinkOptionsJsonMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIPredictionServiceImpl implements AIPredictionService {

    private static final int ML_ERROR_BODY_MAX_LEN = 480;
    private static final double DEFAULT_SALES_FALLBACK = 3_780_000.0;
    private static final int INVENTORY_LOOKBACK_DAYS = 30;
    private static final BigDecimal DEFAULT_SIZE_MULTIPLIER = BigDecimal.ONE;
    private static final Map<String, Map<String, BigDecimal>> TOPPING_INGREDIENT_USAGE = createToppingIngredientUsage();
    private static final Map<String, String> TOPPING_MENU_ITEM_NAMES = createToppingMenuItemNames();

    private final WeatherService weatherService;
    private final AreaBusynessService areaBusynessService;
    private final EventService eventService;
    private final ReportService reportService;
    private final InventoryRepository inventoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final OrderItemRepository orderItemRepository;
    private final RecipeRepository recipeRepository;
    private final HolidayCalendarRepository holidayCalendarRepository;
    private final DrinkOptionsJsonMapper drinkOptionsJsonMapper;

    @Qualifier("mlServiceRestTemplate")
    private final RestTemplate mlServiceRestTemplate;

    private final OpenAiComparisonService openAiComparisonService;

    @Value("${ml.service.url:http://localhost:8000}")
    private String mlServiceUrl;

    @Value("${app.timezone:Asia/Ho_Chi_Minh}")
    private String appTimezone;

    private static final DateTimeFormatter ANALYSIS_TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private static final double[] CUMULATIVE_FRACTION_END_OF_HOUR = {
            0.01, 0.01, 0.01, 0.01, 0.01, 0.01,
            0.02, 0.05, 0.10, 0.18, 0.28, 0.38,
            0.48, 0.55, 0.62, 0.68, 0.73, 0.78,
            0.82, 0.87, 0.92, 0.96, 0.99, 1.00
    };

    private static final double[] AVG_TEMP = {22.5, 23.2, 25.5, 28.0, 30.5, 31.8, 31.5, 31.0, 28.5, 26.0, 24.0, 22.8};
    private static final double[] AVG_RAIN = {10, 5, 3, 5, 10, 10, 8, 12, 50, 80, 50, 25};

    private ZoneId appZone() {
        return ZoneId.of(appTimezone);
    }

    @Override
    public AIPredictionResponseDTO getPrediction(LocalDate targetDate, boolean compareLlm) {
        log.info("[AIPrediction] Thu thap du lieu cho ngay: {} compareLlm={}", targetDate, compareLlm);
        ZoneId zone = appZone();
        LocalDate today = LocalDate.now(zone);
        ZonedDateTime nowZ = ZonedDateTime.now(zone);
        boolean isFuture = targetDate.isAfter(today);

        WeatherSnapshot weather = resolveWeather(targetDate);
        int dayOfWeek = targetDate.getDayOfWeek().getValue();
        int isWeekend = (dayOfWeek == 6 || dayOfWeek == 7) ? 1 : 0;

        ImpactSnapshot impact = resolveEventsAndHoliday(targetDate);
        int areaDensityScore = resolveAreaDensityScore(targetDate, impact);

        double sales1DayAgo = fetchOrEstimateSales(targetDate.minusDays(1));
        double sales7DaysAgo = fetchOrEstimateSales(targetDate.minusDays(7));

        AIPredictionRequestDTO payload = AIPredictionRequestDTO.builder()
                .dayOfWeek(dayOfWeek)
                .temperature(weather.temperature())
                .rainfall(weather.rainfall())
                .isWeekend(isWeekend)
                .isHoliday(impact.isHoliday())
                .eventImpactLevel(impact.maxImpact())
                .areaDensityScore(areaDensityScore)
                .sales1DayAgo(sales1DayAgo)
                .sales7DaysAgo(sales7DaysAgo)
                .build();

        log.info("[AIPrediction] Payload -> date={} dow={} weekend={} holiday={} impact={} temp={}C rain={}mm density={} sales1={} sales7={}",
                targetDate, dayOfWeek, isWeekend, impact.isHoliday(), impact.maxImpact(),
                weather.temperature(), weather.rainfall(), areaDensityScore, sales1DayAgo, sales7DaysAgo);

        AIPredictionResponseDTO result = callMlService(payload);

        String intraDayForLlm = applyIntraDayEnrichment(targetDate, isFuture, today, nowZ, result);

        String suffix = isFuture
                ? " | Ngày: " + targetDate + " (thời tiết ước tính)"
                : " | Ngày: " + targetDate + " | Giờ phân tích: " + nowZ.format(ANALYSIS_TS) + " (" + appTimezone + ")";
        if (result.getMessage() != null) {
            result.setMessage(result.getMessage() + suffix);
        }

        attachInventorySuggestionSafely(result);

        result.setLlmComparison(openAiComparisonService.compareIfRequested(
                compareLlm, targetDate, payload, result, intraDayForLlm));

        return result;
    }

    private String applyIntraDayEnrichment(
            LocalDate targetDate,
            boolean isFuture,
            LocalDate today,
            ZonedDateTime nowZ,
            AIPredictionResponseDTO result
    ) {
        result.setAnalysisAtLocal(nowZ.format(ANALYSIS_TS));

        if (isFuture || !targetDate.equals(today)) {
            result.setPredictionKind("full_day_ml");
            result.setDayProgressFraction(null);
            return "";
        }

        List<DailySalesReportDTO> rep = reportService.getDailyOperationalSalesReport(today);
        double actualRev = 0.0;
        long actualOrds = 0L;
        if (!rep.isEmpty()) {
            if (rep.get(0).getTotalRevenue() != null) {
                actualRev = rep.get(0).getTotalRevenue().doubleValue();
            }
            if (rep.get(0).getTotalOrders() != null) {
                actualOrds = rep.get(0).getTotalOrders();
            }
        }

        LocalTime lt = nowZ.toLocalTime();
        double frac = cumulativeSalesFractionAt(lt);
        result.setDayProgressFraction(frac);
        result.setActualRevenueSoFar(actualRev);
        result.setActualOrdersSoFar(actualOrds);

        double mlRev = result.getPredictedRevenue() != null ? result.getPredictedRevenue() : 0.0;
        int mlOrd = result.getPredictedOrders() != null ? result.getPredictedOrders() : 1;
        result.setMlBaselineRevenue(mlRev);
        result.setMlBaselineOrders(mlOrd);

        boolean canAdjust = actualRev > 0 && frac >= 0.14 && lt.getHour() >= 10 && mlRev > 0;
        if (!canAdjust) {
            result.setPredictionKind("full_day_ml");
            if (actualRev > 0 || actualOrds > 0) {
                return """
                        Cùng ngày với thời điểm phân tích. Đã ghi nhận vận hành %.0f VNĐ và %d đơn hoàn thành; tiến độ ngày ước ~%.0f%%.
                        Chưa hậu chỉnh EOD (chưa đủ điều kiện hoặc ML = 0) - predicted_* vẫn là dự báo ML cả ngày.
                        """.formatted(actualRev, actualOrds, frac * 100.0).trim();
            }
            return """
                    Cùng ngày; chưa có doanh thu vận hành ghi nhận hoặc còn quá sớm - predicted_* là dự báo ML cả ngày. Tiến độ ngày ước ~%.0f%%.
                    """.formatted(frac * 100.0).trim();
        }

        double impliedEod = actualRev / frac;
        double hoursFromOpen = lt.getHour() + lt.getMinute() / 60.0 - 9.0;
        double w = Math.min(0.88, Math.max(0.18, hoursFromOpen / 11.0));
        double blended = (1.0 - w) * mlRev + w * impliedEod;
        blended = Math.max(blended, actualRev);
        double cap = Math.max(mlRev * 1.38, impliedEod * 1.22);
        blended = Math.min(blended, cap);
        blended = Math.round(blended / 1000.0) * 1000.0;

        double impliedOrd = actualOrds / Math.max(frac, 0.14);
        double blendedOrdD = (1.0 - w) * mlOrd + w * impliedOrd;
        int blendedOrd = Math.max((int) Math.round(blendedOrdD), (int) actualOrds);
        blendedOrd = Math.max(1, blendedOrd);

        result.setPredictedRevenue(blended);
        result.setPredictedOrders(blendedOrd);
        double conf = result.getConfidenceScore() != null ? result.getConfidenceScore() : 0.75;
        result.setConfidenceScore(Math.min(0.95, conf + 0.04 * w));
        result.setPredictionKind("eod_adjusted");

        String extraMsg = " | Hậu chỉnh cuối ngày: đã ghi nhận vận hành ~%s tại %.0f%% tiến độ ngày; ML cả ngày ~%s -> ước EOD ~%s"
                .formatted(formatVnd(actualRev), frac * 100.0, formatVnd(mlRev), formatVnd(blended));
        result.setMessage((result.getMessage() != null ? result.getMessage() : "") + extraMsg);

        log.info("[AIPrediction] EOD hau chinh: actual={} frac={} w={} ml={} -> blended={}",
                actualRev, String.format("%.3f", frac), String.format("%.2f", w), mlRev, blended);

        return """
                Thời điểm: %s (múi giờ %s)
                Tiến độ ngày ước (đường cong F&B điển hình đến giờ này): %.1f%%
                Đã ghi nhận vận hành trong ngày: %.0f VNĐ, %d đơn hoàn thành
                ML baseline (cả ngày, trước hậu chỉnh): %.0f VNĐ, %d đơn
                Ước suy ra nếu giữ nhịp (actual/frac): ~%.0f VNĐ
                Trọng số thực tế trong công thức trộn: ~%.0f%%
                Kết quả DSS sau hậu chỉnh (predicted_*): %.0f VNĐ, %d đơn
                """.formatted(
                result.getAnalysisAtLocal(),
                appTimezone,
                frac * 100.0,
                actualRev,
                actualOrds,
                mlRev,
                mlOrd,
                impliedEod,
                w * 100.0,
                blended,
                blendedOrd
        ).trim();
    }

    private static double cumulativeSalesFractionAt(LocalTime time) {
        double hFrac = time.getHour() + time.getMinute() / 60.0;
        if (hFrac >= 23.999) {
            return 1.0;
        }
        int h0 = (int) Math.floor(hFrac);
        double t = hFrac - h0;
        int h1 = Math.min(23, h0 + 1);
        double c0 = CUMULATIVE_FRACTION_END_OF_HOUR[h0];
        double c1 = CUMULATIVE_FRACTION_END_OF_HOUR[h1];
        return c0 + t * (c1 - c0);
    }

    private static String formatVnd(double v) {
        return String.format("%,.0f VNĐ", v);
    }

    private AIPredictionResponseDTO callMlService(AIPredictionRequestDTO payload) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<AIPredictionRequestDTO> entity = new HttpEntity<>(payload, headers);

            ResponseEntity<AIPredictionResponseDTO> response = mlServiceRestTemplate.exchange(
                    mlServiceUrl + "/api/v1/predict/",
                    HttpMethod.POST,
                    entity,
                    AIPredictionResponseDTO.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
            throw new AiPredictionException("Python ML tra status khong thanh cong: " + response.getStatusCode());
        } catch (ResourceAccessException e) {
            log.error("[AIPrediction] Khong ket noi duoc ML tai {}", mlServiceUrl, e);
            throw new AiPredictionException(
                    "Không thể kết nối tới dịch vụ AI. Chạy uvicorn trong ml-service và kiểm tra ML_SERVICE_URL.",
                    e);
        } catch (HttpClientErrorException e) {
            String body = truncateForUserMessage(e.getResponseBodyAsString(StandardCharsets.UTF_8));
            log.error("[AIPrediction] ML HTTP {} - {}", e.getStatusCode(), body);
            String hint = e.getStatusCode().value() == 422
                    ? " (422: body JSON không khớp schema Python.)"
                    : "";
            throw new AiPredictionException(
                    "ML Service trả lỗi " + e.getStatusCode() + hint + (body.isBlank() ? "" : " - " + body),
                    e);
        } catch (HttpStatusCodeException e) {
            String body = truncateForUserMessage(e.getResponseBodyAsString(StandardCharsets.UTF_8));
            log.error("[AIPrediction] ML HTTP {} - {}", e.getStatusCode(), body);
            throw new AiPredictionException(
                    "ML Service không sẵn sàng: " + e.getStatusCode() + (body.isBlank() ? "" : " - " + body),
                    e);
        } catch (RestClientException e) {
            log.error("[AIPrediction] Loi RestTemplate: {}", e.getMessage());
            throw new AiPredictionException("Lỗi khi gọi dịch vụ AI: " + e.getMessage(), e);
        }
    }

    private void attachInventorySuggestionSafely(AIPredictionResponseDTO result) {
        if (result.getPredictedOrders() == null || result.getPredictedOrders() <= 0) {
            return;
        }
        try {
            InventoryProjectionSummary projection = calculateInventoryProjection(result.getPredictedOrders());
            result.setPredictedInventoryDemand(projection.shortfalls());
            result.setPredictedInventoryOverview(projection.overview());
            if (projection.shortfalls().isEmpty() && projection.evaluated()) {
                String base = result.getMessage() != null ? result.getMessage() : "";
                result.setMessage(base + " | Kho: đủ cho mức dự báo - không cần gợi ý nhập thêm.");
                log.debug("[AIPrediction] Ton kho du so voi nhu cau uoc luong - bo qua goi y nhap.");
            }
        } catch (Exception e) {
            log.warn("[AIPrediction] Bo qua goi y kho (khong chan du bao): {}", e.getMessage());
            result.setPredictedInventoryDemand(Map.of());
            result.setPredictedInventoryOverview(List.of());
            String base = result.getMessage() != null ? result.getMessage() : "";
            result.setMessage(base + " | Gợi ý kho: tạm thời không tính được (xem log server).");
        }
    }

    private static String truncateForUserMessage(String body) {
        if (body == null || body.isBlank()) {
            return "";
        }
        String t = body.replaceAll("\\s+", " ").trim();
        return t.length() <= ML_ERROR_BODY_MAX_LEN ? t : t.substring(0, ML_ERROR_BODY_MAX_LEN) + "...";
    }

    private WeatherSnapshot resolveWeather(LocalDate targetDate) {
        try {
            WeatherDataDTO w = weatherService.getWeatherByDate(targetDate);
            if (w != null && w.getTemperature() != null) {
                double rain = w.getRainfall() != null ? w.getRainfall() : 0.0;
                log.info("[AIPrediction] Thoi tiet DB {}: {}C {}mm", targetDate, w.getTemperature(), rain);
                return new WeatherSnapshot(w.getTemperature(), rain);
            }
        } catch (Exception e) {
            log.warn("[AIPrediction] Loi doc thoi tiet: {}", e.getMessage());
        }
        int mi = targetDate.getMonthValue() - 1;
        log.info("[AIPrediction] Uoc tinh mua vu thang {}: {}C ~{}mm", targetDate.getMonthValue(), AVG_TEMP[mi], AVG_RAIN[mi]);
        return new WeatherSnapshot(AVG_TEMP[mi], AVG_RAIN[mi]);
    }

    private ImpactSnapshot resolveEventsAndHoliday(LocalDate targetDate) {
        int isHoliday = 0;
        int maxImpact = 1;

        try {
            if (holidayCalendarRepository.existsByHolidayDate(targetDate)) {
                isHoliday = 1;
                log.debug("[AIPrediction] {} co trong lich ngay le he thong", targetDate);
            }
        } catch (Exception e) {
            log.warn("[AIPrediction] Loi kiem tra holiday calendar: {}", e.getMessage());
        }

        try {
            List<EventDTO> events = eventService.getActiveEventsByDate(targetDate);
            for (EventDTO event : events) {
                String impact = event.getExpectedImpact();
                if (impact == null) {
                    continue;
                }
                int level = switch (impact.trim().toUpperCase()) {
                    case "CRITICAL" -> 4;
                    case "HIGH" -> 3;
                    case "MEDIUM" -> 2;
                    default -> 1;
                };
                if (level > maxImpact) {
                    maxImpact = level;
                }
            }
            if (!events.isEmpty()) {
                log.info("[AIPrediction] {} co {} su kien, impact max={}", targetDate, events.size(), maxImpact);
            }
        } catch (Exception e) {
            log.warn("[AIPrediction] Loi lay su kien {}: {}", targetDate, e.getMessage());
        }

        return new ImpactSnapshot(isHoliday, maxImpact);
    }

    private int resolveAreaDensityScore(LocalDate targetDate, ImpactSnapshot impact) {
        int baseScore = 60;
        try {
            AreaBusynessDTO busyness = areaBusynessService.analyzeCurrentArea();
            if (busyness != null && busyness.getScore() != null) {
                baseScore = busyness.getScore();
            }
        } catch (BadRequestException e) {
            log.warn("[AIPrediction] Chua cau hinh vi tri quan - dung diem mat do mac dinh 60.");
        } catch (Exception e) {
            log.warn("[AIPrediction] Loi mat do khu vuc: {}", e.getMessage());
        }

        int normalizedBase = AreaDensityScoreEstimator.normalizeBaseScore(baseScore, 60);
        int adjustedScore = AreaDensityScoreEstimator.estimate(
                normalizedBase,
                targetDate,
                impact.isHoliday(),
                impact.maxImpact());
        log.info("[AIPrediction] Area density base={} adjusted={} (date={} holiday={} impact={})",
                normalizedBase, adjustedScore, targetDate, impact.isHoliday(), impact.maxImpact());
        return adjustedScore;
    }

    private double fetchOrEstimateSales(LocalDate date) {
        if (date.isAfter(LocalDate.now(appZone()))) {
            return DEFAULT_SALES_FALLBACK;
        }
        try {
            List<DailySalesReportDTO> rep = reportService.getDailySalesReport(date);
            if (!rep.isEmpty() && rep.get(0).getTotalRevenue() != null) {
                double val = rep.get(0).getTotalRevenue().doubleValue();
                if (val > 0) {
                    return val;
                }
            }
        } catch (Exception e) {
            log.warn("[AIPrediction] Loi doanh thu lich su {}: {}", date, e.getMessage());
        }
        return DEFAULT_SALES_FALLBACK;
    }

    private InventoryProjectionSummary calculateInventoryProjection(int predictedOrders) {
        Map<String, Double> shortfallMap = new HashMap<>();
        List<InventoryProjectionLineDTO> overview = new ArrayList<>();
        boolean evaluated = false;
        List<Inventory> inventories = inventoryRepository.findAllWithIngredient();
        if (inventories.isEmpty()) {
            return new InventoryProjectionSummary(shortfallMap, overview, false);
        }

        Map<Long, Ingredient> inventoryIngredients = inventories.stream()
                .map(Inventory::getIngredient)
                .filter(ingredient -> ingredient != null && ingredient.getId() != null)
                .collect(Collectors.toMap(Ingredient::getId, ingredient -> ingredient, (left, right) -> left));
        Map<String, Long> inventoryIngredientIdsByName = inventoryIngredients.values().stream()
                .filter(ingredient -> ingredient.getName() != null)
                .collect(Collectors.toMap(Ingredient::getName, Ingredient::getId, (left, right) -> left));

        Map<Long, BigDecimal> avgUsagePerOrder = estimateAverageIngredientUsagePerOrder(
                inventoryIngredients.keySet(),
                inventoryIngredientIdsByName
        );
        if (avgUsagePerOrder.isEmpty()) {
            return new InventoryProjectionSummary(shortfallMap, overview, false);
        }

        for (Inventory inv : inventories) {
            Ingredient ing = inv.getIngredient();
            if (ing == null || ing.getId() == null || ing.getName() == null) {
                continue;
            }
            BigDecimal avgUsage = avgUsagePerOrder.get(ing.getId());
            if (avgUsage == null || avgUsage.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            BigDecimal demand = avgUsage.multiply(BigDecimal.valueOf(predictedOrders));
            if (demand.compareTo(BigDecimal.valueOf(0.05)) <= 0) {
                continue;
            }

            evaluated = true;
            BigDecimal onHand = inv.getQuantity() != null ? inv.getQuantity() : BigDecimal.ZERO;
            BigDecimal shortfall = demand.subtract(onHand);
            double demandRounded = roundUpTwoDecimals(demand.doubleValue());
            double onHandRounded = roundUpTwoDecimals(onHand.doubleValue());
            double shortfallRounded = shortfall.compareTo(BigDecimal.ZERO) > 0
                    ? roundUpTwoDecimals(shortfall.doubleValue())
                    : 0.0;
            String unit = ing.getUnit() != null ? ing.getUnit() : "";

            overview.add(InventoryProjectionLineDTO.builder()
                    .ingredientName(ing.getName())
                    .unit(unit)
                    .predictedDemand(demandRounded)
                    .onHand(onHandRounded)
                    .shortfall(shortfallRounded)
                    .shortItem(shortfall.compareTo(BigDecimal.ZERO) > 0)
                    .build());

            if (shortfall.compareTo(BigDecimal.valueOf(0.02)) > 0) {
                String key = ing.getName() + " (" + unit + ")";
                double rounded = shortfallRounded;
                shortfallMap.put(key, rounded);
            }
        }

        overview.sort(Comparator
                .comparing(InventoryProjectionLineDTO::getShortfall, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(InventoryProjectionLineDTO::getIngredientName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)));

        return new InventoryProjectionSummary(shortfallMap, overview, evaluated);
    }

    private Map<String, Double> calculateInventoryShortfalls(int predictedOrders, boolean[] evaluatedSkuOut) {
        InventoryProjectionSummary projection = calculateInventoryProjection(predictedOrders);
        evaluatedSkuOut[0] = projection.evaluated();
        return projection.shortfalls();
    }

    private Map<Long, BigDecimal> estimateAverageIngredientUsagePerOrder(
            Set<Long> inventoryIngredientIds,
            Map<String, Long> inventoryIngredientIdsByName
    ) {
        LocalDateTime now = LocalDateTime.now(appZone());
        LocalDateTime start = now.minusDays(INVENTORY_LOOKBACK_DAYS);

        List<OrderItem> recentItems = orderItemRepository.findRecentByOrderStatusAndCreatedAtBetween(
                OrderStatus.COMPLETED, start, now);
        if (!recentItems.isEmpty()) {
            Map<Long, BigDecimal> usage = estimateUsageFromOrderHistory(
                    recentItems,
                    inventoryIngredientIds,
                    inventoryIngredientIdsByName
            );
            if (!usage.isEmpty()) {
                return usage;
            }
        }

        return estimateUsageFromMenuRecipes(inventoryIngredientIds, inventoryIngredientIdsByName);
    }

    private Map<Long, BigDecimal> estimateUsageFromOrderHistory(
            List<OrderItem> recentItems,
            Set<Long> inventoryIngredientIds,
            Map<String, Long> inventoryIngredientIdsByName
    ) {
        Map<Long, List<C2SE._1.Capstone2.entity.Recipe>> recipesByMenuItem = loadRecipesByMenuItem(recentItems.stream()
                .map(OrderItem::getMenuItem)
                .filter(menuItem -> menuItem != null && menuItem.getId() != null)
                .map(MenuItem::getId)
                .collect(Collectors.toSet()));
        Map<String, Map<Long, BigDecimal>> toppingRecipeUsage = resolveToppingIngredientUsage(inventoryIngredientIdsByName);

        Map<Long, BigDecimal> totalUsage = new HashMap<>();
        BigDecimal totalUnits = BigDecimal.ZERO;

        for (OrderItem item : recentItems) {
            int quantity = item.getQuantity() != null ? item.getQuantity() : 0;
            if (quantity <= 0 || item.getMenuItem() == null || item.getMenuItem().getId() == null) {
                continue;
            }

            Map<Long, BigDecimal> perUnitUsage = estimateIngredientUsageForItem(
                    item.getMenuItem(),
                    item.getSelectedSizeCode(),
                    item.getSelectedToppingsJson(),
                    recipesByMenuItem.getOrDefault(item.getMenuItem().getId(), List.of()),
                    inventoryIngredientIds,
                    inventoryIngredientIdsByName,
                    toppingRecipeUsage
            );
            if (perUnitUsage.isEmpty()) {
                continue;
            }

            BigDecimal quantityDecimal = BigDecimal.valueOf(quantity);
            totalUnits = totalUnits.add(quantityDecimal);
            for (Map.Entry<Long, BigDecimal> entry : perUnitUsage.entrySet()) {
                totalUsage.merge(entry.getKey(), entry.getValue().multiply(quantityDecimal), BigDecimal::add);
            }
        }

        if (totalUnits.compareTo(BigDecimal.ZERO) <= 0) {
            return Map.of();
        }
        return divideUsageByUnits(totalUsage, totalUnits);
    }

    private Map<Long, BigDecimal> estimateUsageFromMenuRecipes(
            Set<Long> inventoryIngredientIds,
            Map<String, Long> inventoryIngredientIdsByName
    ) {
        List<MenuItem> availableItems = menuItemRepository.findByAvailableTrue();
        if (availableItems.isEmpty()) {
            return Map.of();
        }

        Map<Long, List<C2SE._1.Capstone2.entity.Recipe>> recipesByMenuItem = loadRecipesByMenuItem(availableItems.stream()
                .map(MenuItem::getId)
                .collect(Collectors.toSet()));
        Map<String, Map<Long, BigDecimal>> toppingRecipeUsage = resolveToppingIngredientUsage(inventoryIngredientIdsByName);

        Map<Long, BigDecimal> totalUsage = new HashMap<>();
        BigDecimal countedItems = BigDecimal.ZERO;

        for (MenuItem item : availableItems) {
            Map<Long, BigDecimal> perUnitUsage = estimateIngredientUsageForItem(
                    item,
                    defaultSizeCode(item),
                    null,
                    recipesByMenuItem.getOrDefault(item.getId(), List.of()),
                    inventoryIngredientIds,
                    inventoryIngredientIdsByName,
                    toppingRecipeUsage
            );
            if (perUnitUsage.isEmpty()) {
                continue;
            }
            countedItems = countedItems.add(BigDecimal.ONE);
            for (Map.Entry<Long, BigDecimal> entry : perUnitUsage.entrySet()) {
                totalUsage.merge(entry.getKey(), entry.getValue(), BigDecimal::add);
            }
        }

        if (countedItems.compareTo(BigDecimal.ZERO) <= 0) {
            return Map.of();
        }
        return divideUsageByUnits(totalUsage, countedItems);
    }

    private Map<Long, BigDecimal> estimateIngredientUsageForItem(
            MenuItem menuItem,
            String selectedSizeCode,
            String selectedToppingsJson,
            List<C2SE._1.Capstone2.entity.Recipe> recipes,
            Set<Long> inventoryIngredientIds,
            Map<String, Long> inventoryIngredientIdsByName,
            Map<String, Map<Long, BigDecimal>> toppingRecipeUsage
    ) {
        if (menuItem == null || recipes == null || recipes.isEmpty()) {
            return Map.of();
        }

        BigDecimal sizeMultiplier = resolveSizeMultiplier(menuItem, selectedSizeCode);
        Map<Long, BigDecimal> usage = new HashMap<>();
        for (C2SE._1.Capstone2.entity.Recipe recipe : recipes) {
            Ingredient ingredient = recipe.getIngredient();
            if (ingredient == null || ingredient.getId() == null || recipe.getQuantity() == null) {
                continue;
            }
            if (!inventoryIngredientIds.contains(ingredient.getId())) {
                continue;
            }
            usage.merge(
                    ingredient.getId(),
                    recipe.getQuantity().multiply(sizeMultiplier),
                    BigDecimal::add
            );
        }

        for (OrderToppingLineDTO topping : drinkOptionsJsonMapper.toppingSnapshotJsonToList(selectedToppingsJson)) {
            Map<Long, BigDecimal> toppingUsage = toppingRecipeUsage.get(topping.getCode());
            if (toppingUsage == null || toppingUsage.isEmpty()) {
                continue;
            }
            for (Map.Entry<Long, BigDecimal> toppingEntry : toppingUsage.entrySet()) {
                if (!inventoryIngredientIds.contains(toppingEntry.getKey())) {
                    continue;
                }
                BigDecimal extra = toppingEntry.getValue();
                if (extra != null && extra.compareTo(BigDecimal.ZERO) > 0) {
                    usage.merge(toppingEntry.getKey(), extra, BigDecimal::add);
                }
            }
        }
        return usage;
    }

    private Map<Long, List<C2SE._1.Capstone2.entity.Recipe>> loadRecipesByMenuItem(Set<Long> menuItemIds) {
        if (menuItemIds == null || menuItemIds.isEmpty()) {
            return Map.of();
        }
        return recipeRepository.findByMenuItemIdIn(menuItemIds).stream()
                .collect(Collectors.groupingBy(recipe -> recipe.getMenuItem().getId()));
    }

    private Map<String, Map<Long, BigDecimal>> resolveToppingIngredientUsage(Map<String, Long> inventoryIngredientIdsByName) {
        Map<String, Map<Long, BigDecimal>> resolved = new HashMap<>();
        List<MenuItem> toppingMenuItems = menuItemRepository.findByNameIn(TOPPING_MENU_ITEM_NAMES.values());
        Map<String, MenuItem> toppingItemsByName = toppingMenuItems.stream()
                .collect(Collectors.toMap(MenuItem::getName, menuItem -> menuItem, (left, right) -> left));
        Map<Long, List<C2SE._1.Capstone2.entity.Recipe>> toppingRecipesByMenuItem = loadRecipesByMenuItem(
                toppingMenuItems.stream().map(MenuItem::getId).collect(Collectors.toSet())
        );

        for (Map.Entry<String, String> entry : TOPPING_MENU_ITEM_NAMES.entrySet()) {
            MenuItem toppingMenu = toppingItemsByName.get(entry.getValue());
            Map<Long, BigDecimal> recipeUsage = toppingMenu != null
                    ? buildIngredientUsageFromRecipes(
                            toppingRecipesByMenuItem.getOrDefault(toppingMenu.getId(), List.of()),
                            inventoryIngredientIdsByName
                    )
                    : Map.of();
            if (recipeUsage.isEmpty()) {
                recipeUsage = fallbackToppingIngredientUsage(entry.getKey(), inventoryIngredientIdsByName);
            }
            if (!recipeUsage.isEmpty()) {
                resolved.put(entry.getKey(), recipeUsage);
            }
        }
        return resolved;
    }

    private Map<Long, BigDecimal> buildIngredientUsageFromRecipes(
            List<C2SE._1.Capstone2.entity.Recipe> recipes,
            Map<String, Long> inventoryIngredientIdsByName
    ) {
        if (recipes == null || recipes.isEmpty()) {
            return Map.of();
        }
        Map<Long, BigDecimal> usage = new HashMap<>();
        for (C2SE._1.Capstone2.entity.Recipe recipe : recipes) {
            Ingredient ingredient = recipe.getIngredient();
            if (ingredient == null || ingredient.getName() == null || recipe.getQuantity() == null) {
                continue;
            }
            Long ingredientId = inventoryIngredientIdsByName.get(ingredient.getName());
            if (ingredientId == null) {
                continue;
            }
            usage.merge(ingredientId, recipe.getQuantity(), BigDecimal::add);
        }
        return usage;
    }

    private Map<Long, BigDecimal> fallbackToppingIngredientUsage(
            String toppingCode,
            Map<String, Long> inventoryIngredientIdsByName
    ) {
        Map<String, BigDecimal> fallback = TOPPING_INGREDIENT_USAGE.get(toppingCode);
        if (fallback == null || fallback.isEmpty()) {
            return Map.of();
        }
        Map<Long, BigDecimal> usage = new HashMap<>();
        for (Map.Entry<String, BigDecimal> entry : fallback.entrySet()) {
            Long ingredientId = inventoryIngredientIdsByName.get(entry.getKey());
            if (ingredientId != null) {
                usage.put(ingredientId, entry.getValue());
            }
        }
        return usage;
    }

    private Map<Long, BigDecimal> divideUsageByUnits(Map<Long, BigDecimal> totalUsage, BigDecimal units) {
        Map<Long, BigDecimal> avgUsage = new HashMap<>();
        for (Map.Entry<Long, BigDecimal> entry : totalUsage.entrySet()) {
            avgUsage.put(entry.getKey(), entry.getValue().divide(units, 4, java.math.RoundingMode.HALF_UP));
        }
        return avgUsage;
    }

    private static double roundUpTwoDecimals(double value) {
        return Math.ceil(value * 100.0) / 100.0;
    }

    private BigDecimal resolveSizeMultiplier(MenuItem menuItem, String selectedSizeCode) {
        if (menuItem == null || !Boolean.TRUE.equals(menuItem.getDrink())) {
            return DEFAULT_SIZE_MULTIPLIER;
        }
        List<DrinkSizeOptionDTO> sizes = new ArrayList<>(drinkOptionsJsonMapper.parseSizes(menuItem.getDrinkSizesJson()));
        if (sizes.isEmpty()) {
            return DEFAULT_SIZE_MULTIPLIER;
        }

        sizes.sort(Comparator.comparing(size -> size.getPriceExtra() != null ? size.getPriceExtra() : BigDecimal.ZERO));
        int selectedIndex = 0;
        if (selectedSizeCode != null && !selectedSizeCode.isBlank()) {
            for (int i = 0; i < sizes.size(); i++) {
                if (selectedSizeCode.equalsIgnoreCase(sizes.get(i).getCode())) {
                    selectedIndex = i;
                    break;
                }
            }
        }

        if (sizes.size() == 1) {
            return BigDecimal.ONE;
        }
        if (sizes.size() == 2) {
            return selectedIndex == 0 ? BigDecimal.ONE : BigDecimal.valueOf(1.30);
        }
        if (sizes.size() == 3) {
            return switch (selectedIndex) {
                case 1 -> BigDecimal.valueOf(1.25);
                case 2 -> BigDecimal.valueOf(1.50);
                default -> BigDecimal.ONE;
            };
        }
        return BigDecimal.valueOf(1.0 + (selectedIndex * 0.15));
    }

    private String defaultSizeCode(MenuItem menuItem) {
        List<DrinkSizeOptionDTO> sizes = new ArrayList<>(drinkOptionsJsonMapper.parseSizes(menuItem.getDrinkSizesJson()));
        if (sizes.isEmpty()) {
            return null;
        }
        sizes.sort(Comparator.comparing(size -> size.getPriceExtra() != null ? size.getPriceExtra() : BigDecimal.ZERO));
        return sizes.get(0).getCode();
    }

    private static Map<String, Map<String, BigDecimal>> createToppingIngredientUsage() {
        Map<String, Map<String, BigDecimal>> config = new HashMap<>();
        config.put("TRAN_CHAU", Map.of("Trân châu", BigDecimal.valueOf(30)));
        config.put("TRAN_CHAU_DD", Map.of(
                "Trân châu", BigDecimal.valueOf(35),
                "Đường", BigDecimal.valueOf(8)
        ));
        config.put("TRAN_CHAU_HK", Map.of("Trân châu", BigDecimal.valueOf(35)));
        config.put("KEM_CHEESE", Map.of("Kem whip", BigDecimal.valueOf(25)));
        config.put("KEM_TUOI", Map.of("Kem whip", BigDecimal.valueOf(20)));
        config.put("THACH", Map.of("Thạch trái cây", BigDecimal.valueOf(30)));
        config.put("THACH_DUA", Map.of("Thạch dừa", BigDecimal.valueOf(30)));
        config.put("PHO_MAI_TUOI", Map.of("Phô mai tươi", BigDecimal.valueOf(25)));
        config.put("PUDDING", Map.of("Pudding trứng", BigDecimal.ONE));
        config.put("FLAN", Map.of("Bánh flan", BigDecimal.ONE));
        config.put("NHADAM", Map.of("Nha đam", BigDecimal.valueOf(25)));
        config.put("SUONG_SAO", Map.of("Sương sáo", BigDecimal.valueOf(25)));
        config.put("BOT_DE", Map.of("Bột đậu đỏ", BigDecimal.valueOf(20)));
        return Map.copyOf(config);
    }

    private static Map<String, String> createToppingMenuItemNames() {
        Map<String, String> config = new HashMap<>();
        config.put("TRAN_CHAU", "Trân châu đen");
        config.put("TRAN_CHAU_DD", "Trân châu đường đen");
        config.put("TRAN_CHAU_HK", "Trân châu hoàng kim");
        config.put("THACH", "Thạch trái cây");
        config.put("THACH_DUA", "Thạch dừa");
        config.put("KEM_CHEESE", "Kem cheese (thêm)");
        config.put("PHO_MAI_TUOI", "Phô mai tươi (topping)");
        config.put("PUDDING", "Pudding trứng (thêm)");
        config.put("FLAN", "Bánh flan (thêm)");
        config.put("NHADAM", "Nha đam (thêm)");
        config.put("KEM_TUOI", "Kem tươi (thêm)");
        config.put("SUONG_SAO", "Sương sáo (thêm)");
        config.put("BOT_DE", "Bột đậu đỏ (thêm)");
        return Map.copyOf(config);
    }

    private record WeatherSnapshot(double temperature, double rainfall) {}

    private record ImpactSnapshot(int isHoliday, int maxImpact) {}

    private record InventoryProjectionSummary(
            Map<String, Double> shortfalls,
            List<InventoryProjectionLineDTO> overview,
            boolean evaluated
    ) {}
}
