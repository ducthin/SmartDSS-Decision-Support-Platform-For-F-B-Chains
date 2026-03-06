package C2SE._1.Capstone2.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BestProductDTO {
    private Long menuItemId;
    private String menuItemName;
    private Long totalQuantitySold;
}
