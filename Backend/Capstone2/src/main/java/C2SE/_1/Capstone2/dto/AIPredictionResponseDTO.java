package C2SE._1.Capstone2.dto;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonAutoDetect(
        fieldVisibility = JsonAutoDetect.Visibility.ANY,
        getterVisibility = JsonAutoDetect.Visibility.NONE,
        isGetterVisibility = JsonAutoDetect.Visibility.NONE
)
public class AIPredictionResponseDTO {

    @JsonProperty("predicted_revenue")
    private Double predictedRevenue;

    @JsonProperty("predicted_orders")
    private Integer predictedOrders;

    @JsonProperty("predicted_inventory_demand")
    private Map<String, Double> predictedInventoryDemand;

    @JsonProperty("predicted_inventory_overview")
    private List<InventoryProjectionLineDTO> predictedInventoryOverview;

    @JsonProperty("confidence_score")
    private Double confidenceScore;

    @JsonProperty("message")
    private String message;

    /** Thời điểm chạy phân tích theo giờ địa phương (app.timezone), vd: 2026-03-22 19:05 */
    @JsonProperty("analysis_at_local")
    private String analysisAtLocal;

    /** full_day_ml | eod_adjusted */
    @JsonProperty("prediction_kind")
    private String predictionKind;

    /** 0–1: tỷ lệ doanh thu điển hình đã “qua” tại giờ hiện tại (F&B cà phê). */
    @JsonProperty("day_progress_fraction")
    private Double dayProgressFraction;

    /** Doanh thu đã ghi nhận trong ngày mục tiêu (khi prediction_kind = eod_adjusted hoặc cùng ngày). */
    @JsonProperty("actual_revenue_so_far")
    private Double actualRevenueSoFar;

    /** Số đơn đã ghi nhận trong ngày mục tiêu. */
    @JsonProperty("actual_orders_so_far")
    private Long actualOrdersSoFar;

    /** Dự báo ML thuần (cả ngày) trước khi hậu chỉnh theo giờ — để so sánh. */
    @JsonProperty("ml_baseline_revenue")
    private Double mlBaselineRevenue;

    @JsonProperty("ml_baseline_orders")
    private Integer mlBaselineOrders;

    /** So sánh tùy chọn với OpenAI (chỉ khi gọi API kèm compareLlm=true). */
    @JsonProperty("llm_comparison")
    private LlmComparisonDTO llmComparison;
}
