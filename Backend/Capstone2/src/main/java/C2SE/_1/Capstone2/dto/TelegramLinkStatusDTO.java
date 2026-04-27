package C2SE._1.Capstone2.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TelegramLinkStatusDTO {
    private boolean linked;
    private String phone;
    private String telegramUsername;
    private String telegramFullName;
}
