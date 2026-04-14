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
public class InventoryProjectionLineDTO {

    @JsonProperty("ingredient_name")
    private String ingredientName;

    @JsonProperty("unit")
    private String unit;

    @JsonProperty("predicted_demand")
    private Double predictedDemand;

    @JsonProperty("on_hand")
    private Double onHand;

    @JsonProperty("shortfall")
    private Double shortfall;

    @JsonProperty("is_short")
    private Boolean shortItem;
}
