package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.TelegramLinkStatusDTO;

import java.util.Map;

public interface TelegramLinkService {
    String buildOptInUrl(String phone);
    TelegramLinkStatusDTO getLinkStatus(String phone);
    void handleWebhook(Map<String, Object> payload);
}
