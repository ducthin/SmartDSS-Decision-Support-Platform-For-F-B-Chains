package C2SE._1.Capstone2.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PublicPersonalVoucherDTO {
    private String code;
    private String title;
    private String discountLabel;
    private String validUntil;
}
