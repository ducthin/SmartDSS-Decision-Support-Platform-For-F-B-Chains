package C2SE._1.Capstone2.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IngredientDTO {
    private Long id;
    private String name;
    private String unit;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
