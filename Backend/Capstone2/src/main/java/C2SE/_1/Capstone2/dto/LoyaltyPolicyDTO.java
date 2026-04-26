package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
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
public class LoyaltyPolicyDTO {

    @NotNull(message = "Số điểm không được để trống")
    @Min(value = 0, message = "Số điểm không được âm")
    @Max(value = 100, message = "Số điểm tối đa là 100 điểm mỗi 10.000đ")
    private Integer pointsPerTenThousandVnd;
}
