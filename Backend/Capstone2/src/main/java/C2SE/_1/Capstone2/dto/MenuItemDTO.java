package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MenuItemDTO {
    private Long id;

    @NotBlank(message = "Tên món không được để trống")
    @Size(max = 150, message = "Tên món tối đa 150 ký tự")
    private String name;

    @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
    private String description;

    @NotNull(message = "Giá không được để trống")
    @DecimalMin(value = "0", message = "Giá phải >= 0")
    private BigDecimal price;

    private String imageUrl;
    private Boolean available;

    @NotNull(message = "Danh mục không được để trống")
    private Long categoryId;
    private String categoryName;
    private List<RecipeDTO> recipes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
