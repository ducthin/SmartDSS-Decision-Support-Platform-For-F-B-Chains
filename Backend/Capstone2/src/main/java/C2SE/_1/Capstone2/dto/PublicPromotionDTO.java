package C2SE._1.Capstone2.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PublicPromotionDTO {
    private String id;
    private String sourceType; // EVENT | HOLIDAY | VOUCHER
    private String badge;
    private String title;
    private String description;
    private String discountLabel;
    private String validUntil;
}

