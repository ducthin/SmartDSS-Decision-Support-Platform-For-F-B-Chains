package C2SE._1.Capstone2.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreLocationDTO {
    private Double latitude;
    private Double longitude;
    private String address;
}
