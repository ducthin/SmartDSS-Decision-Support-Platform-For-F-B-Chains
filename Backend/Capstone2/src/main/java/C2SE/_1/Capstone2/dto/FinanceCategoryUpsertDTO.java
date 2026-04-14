package C2SE._1.Capstone2.dto;

import C2SE._1.Capstone2.entity.FinanceType;
import jakarta.validation.constraints.NotBlank;
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
public class FinanceCategoryUpsertDTO {

    @NotBlank(message = "Tên danh mục không được để trống")
    private String name;

    @NotNull(message = "Loại danh mục không được để trống")
    private FinanceType type;

    private Boolean active;
}
