package C2SE._1.Capstone2.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationTestResultDTO {

    private boolean sent;
    private String provider;
    private String phone;
    private String detail;
}
