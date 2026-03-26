package C2SE._1.Capstone2.dto;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
public class LlmComparisonDTO {

    /** ok | skipped | error */
    @JsonProperty("status")
    private String status;

    /** Model đã gọi (vd: llama-3.3-70b-versatile, gpt-4o-mini) */
    @JsonProperty("model")
    private String model;

    /** Nhận xét tiếng Việt so với ML */
    @JsonProperty("comment_vi")
    private String commentVi;

    /** Ước lượng thô do LLM đưa ra (có thể null) */
    @JsonProperty("rough_revenue_vnd")
    private Double roughRevenueVnd;

    @JsonProperty("rough_orders")
    private Integer roughOrders;

    /** similar | higher | lower | uncertain */
    @JsonProperty("vs_ml")
    private String vsMl;

    /** Khi status = skipped | error */
    @JsonProperty("detail")
    private String detail;
}
