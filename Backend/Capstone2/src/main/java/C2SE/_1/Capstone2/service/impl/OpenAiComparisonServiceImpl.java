package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.AIPredictionRequestDTO;
import C2SE._1.Capstone2.dto.AIPredictionResponseDTO;
import C2SE._1.Capstone2.dto.LlmComparisonDTO;
import C2SE._1.Capstone2.service.OpenAiComparisonService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class OpenAiComparisonServiceImpl implements OpenAiComparisonService {

    private static final String SYSTEM_PROMPT = """
            Vai trò: Bạn là cố vấn vận hành F&B (cà phê/quán nhỏ–vừa tại Việt Nam), hỗ trợ SO SÁNH với dự báo của mô hình học máy (ML) đã được hệ thống tính sẵn.

            Quy tắc:
            - ML là tham chiếu định lượng chính. Bạn không thay thế ML; bạn giải thích, đồng thuận hoặc nêu lý do nghi ngờ nhẹ dựa trên ngữ cảnh (thời tiết, cuối tuần, lễ, mức sự kiện, doanh thu các ngày trước trong payload).
            - Nếu có khối "cùng ngày theo giờ & số liệu thực": DSS có thể đã trộn ML (cả ngày) với doanh thu đã thu — các số "predicted_*" ở trên là bản sau hậu chỉnh (nếu có), không chỉ thuần ML.
            - Ước lượng của bạn (rough_*) chỉ mang tính tham khảo; nếu thiếu dữ liệu hoặc không chắc → đặt rough_revenue_vnd và rough_orders là null.
            - Thang độ lớn thực tế: quán cà phê VN thường vài triệu đến vài chục triệu VNĐ/ngày tùy quy mô; đừng đưa con số phi thực tế.
            - vs_ml (chọn ĐÚNG một giá trị): "similar" (gần với ML), "higher" (bạn cho rằng thực tế có thể cao hơn ML), "lower" (thấp hơn ML), "uncertain" (không kết luận).
            - comment_vi: 2–5 câu, tiếng Việt tự nhiên, nêu rõ 1–2 yếu tố từ đặc trưng đầu vào (vd: mưa, nghỉ lễ, sales lag) và mối liên hệ với dự báo ML. Không dùng tiêu đề markdown.

            Đầu ra: CHỈ một object JSON hợp lệ, không ```json```, không văn bản ngoài JSON. Các khóa bắt buộc:
            {"comment_vi":"string","rough_revenue_vnd":number|null,"rough_orders":integer|null,"vs_ml":"similar|higher|lower|uncertain"}
            """;

    private final RestTemplate openAiRestTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${openai.model:llama-3.3-70b-versatile}")
    private String model;

    @Value("${openai.base-url:https://api.groq.com/openai/v1}")
    private String baseUrl;

    @Value("${openai.use-json-response-format:true}")
    private boolean useJsonResponseFormat;

    public OpenAiComparisonServiceImpl(
            @Qualifier("openAiRestTemplate") RestTemplate openAiRestTemplate
    ) {
        this.openAiRestTemplate = openAiRestTemplate;
    }

    @Override
    public LlmComparisonDTO compareIfRequested(
            boolean requested,
            LocalDate targetDate,
            AIPredictionRequestDTO features,
            AIPredictionResponseDTO mlResult,
            String intraDayContextForLlm
    ) {
        if (!requested) {
            return null;
        }
        if (!StringUtils.hasText(apiKey)) {
            return LlmComparisonDTO.builder()
                    .status("skipped")
                    .model(model)
                    .detail("Chưa cấu hình API key: GROQ_API_KEY hoặc OPENAI_API_KEY trong .env.")
                    .build();
        }
        try {
            String featuresJson = objectMapper.writeValueAsString(features);
            String userPrompt = """
                    === Ngữ cảnh ===
                    Ngày cần nhận xét: %s

                    === Đặc trưng hệ thống đã thu thập (JSON, snake_case) ===
                    %s
                    Gợi ý đọc nhanh: day_of_week (1=Thứ Hai … 7=Chủ Nhật ISO), is_weekend, is_holiday, event_impact_level (1–4), temperature (°C), rainfall (mm), area_density_score, sales_1_day_ago / sales_7_days_ago (VNĐ).

                    === Kết quả DSS gửi cho người dùng (có thể đã hậu chỉnh nếu cùng ngày + đã có doanh thu thực) ===
                    - predicted_revenue_vnd: %s
                    - predicted_orders: %s
                    - confidence_score (0–1): %s

                    === Việc cần làm ===
                    So sánh định tính với ML theo đúng format JSON trong system prompt. Nếu thấy ML hợp lý với ngữ cảnh → vs_ml="similar" và có thể để rough_* null. Nếu chênh lệch lý thuyết rõ (vd: mưa lớn + không lễ nhưng ML vẫn rất cao) → nêu trong comment_vi và chọn vs_ml phù hợp hoặc "uncertain".
                    %s
                    """.formatted(
                    targetDate,
                    featuresJson,
                    mlResult.getPredictedRevenue(),
                    mlResult.getPredictedOrders(),
                    mlResult.getConfidenceScore(),
                    formatIntraDayAppendix(intraDayContextForLlm)
            );

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model.trim());
            body.put("temperature", 0.2);
            body.put("max_tokens", 600);
            if (useJsonResponseFormat) {
                body.put("response_format", Map.of("type", "json_object"));
            }
            body.put("messages", List.of(
                    Map.of("role", "system", "content", SYSTEM_PROMPT),
                    Map.of("role", "user", "content", userPrompt)
            ));

            String url = baseUrl.replaceAll("/+$", "") + "/chat/completions";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey.trim());
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = openAiRestTemplate.exchange(
                    url, HttpMethod.POST, entity, String.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return errorDto("HTTP " + response.getStatusCode());
            }
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.asText().isBlank()) {
                return errorDto("Phản hồi LLM không có nội dung.");
            }
            JsonNode parsed = objectMapper.readTree(content.asText());
            return LlmComparisonDTO.builder()
                    .status("ok")
                    .model(model)
                    .commentVi(textOrEmpty(parsed, "comment_vi"))
                    .roughRevenueVnd(readDouble(parsed, "rough_revenue_vnd"))
                    .roughOrders(readInt(parsed, "rough_orders"))
                    .vsMl(textOrEmpty(parsed, "vs_ml"))
                    .build();
        } catch (RestClientException e) {
            log.warn("[LLM] Lỗi gọi API (Groq/OpenAI-compatible): {}", e.getMessage());
            return errorDto(truncate(e.getMessage(), 200));
        } catch (Exception e) {
            log.warn("[LLM] Lỗi xử lý phản hồi: {}", e.getMessage());
            return errorDto(truncate(e.getMessage(), 200));
        }
    }

    private static String textOrEmpty(JsonNode n, String field) {
        if (n == null || !n.has(field) || n.get(field).isNull()) {
            return "";
        }
        return n.get(field).asText("");
    }

    private static Double readDouble(JsonNode parent, String field) {
        if (parent == null || !parent.has(field) || parent.get(field).isNull()) {
            return null;
        }
        JsonNode v = parent.get(field);
        return v.isNumber() ? v.asDouble() : null;
    }

    private static Integer readInt(JsonNode parent, String field) {
        if (parent == null || !parent.has(field) || parent.get(field).isNull()) {
            return null;
        }
        JsonNode v = parent.get(field);
        if (v.isInt() || v.isLong()) {
            return v.asInt();
        }
        if (v.isNumber()) {
            return (int) Math.round(v.asDouble());
        }
        return null;
    }

    private static String formatIntraDayAppendix(String block) {
        if (block == null || block.isBlank()) {
            return "";
        }
        return "\n=== Bổ sung: cùng ngày theo giờ & số liệu thực tế ===\n" + block.trim();
    }

    private LlmComparisonDTO errorDto(String msg) {
        return LlmComparisonDTO.builder()
                .status("error")
                .model(model)
                .detail(msg)
                .build();
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
