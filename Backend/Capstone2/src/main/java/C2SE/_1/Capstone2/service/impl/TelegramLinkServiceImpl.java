package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.TelegramLinkStatusDTO;
import C2SE._1.Capstone2.entity.TelegramSubscriber;
import C2SE._1.Capstone2.repository.TelegramSubscriberRepository;
import C2SE._1.Capstone2.service.TelegramLinkService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramLinkServiceImpl implements TelegramLinkService {

    private final TelegramSubscriberRepository telegramSubscriberRepository;

    @Value("${app.notification.telegram.bot-username:}")
    private String botUsername;

    @Override
    public String buildOptInUrl(String phone) {
        if (!StringUtils.hasText(botUsername)) {
            return "";
        }
        String normalizedPhone = normalizePhone(phone);
        String payload = URLEncoder.encode("phone_" + normalizedPhone, StandardCharsets.UTF_8);
        return "https://t.me/" + botUsername.trim().replace("@", "") + "?start=" + payload;
    }

    @Override
    @Transactional(readOnly = true)
    public TelegramLinkStatusDTO getLinkStatus(String phone) {
        String normalizedPhone = normalizePhone(phone);
        if (!StringUtils.hasText(normalizedPhone)) {
            return TelegramLinkStatusDTO.builder()
                    .linked(false)
                    .phone(normalizedPhone)
                    .build();
        }

        return telegramSubscriberRepository.findByPhone(normalizedPhone)
                .map(subscriber -> TelegramLinkStatusDTO.builder()
                        .linked(true)
                        .phone(subscriber.getPhone())
                        .telegramUsername(subscriber.getTelegramUsername())
                        .telegramFullName(subscriber.getTelegramFullName())
                        .build())
                .orElseGet(() -> TelegramLinkStatusDTO.builder()
                        .linked(false)
                        .phone(normalizedPhone)
                        .build());
    }

    @Override
    @Transactional
    @SuppressWarnings("unchecked")
    public void handleWebhook(Map<String, Object> payload) {
        Map<String, Object> message = (Map<String, Object>) payload.get("message");
        if (message == null) {
            message = (Map<String, Object>) payload.get("edited_message");
        }
        if (message == null) return;

        String text = String.valueOf(message.getOrDefault("text", "")).trim();
        if (!text.startsWith("/start")) return;

        String[] parts = text.split("\\s+", 2);
        if (parts.length < 2 || !parts[1].startsWith("phone_")) {
            log.info("Telegram start without phone payload: {}", text);
            return;
        }

        String phone = normalizePhone(parts[1].substring("phone_".length()));
        if (!StringUtils.hasText(phone)) return;

        Map<String, Object> chat = (Map<String, Object>) message.get("chat");
        Map<String, Object> from = (Map<String, Object>) message.get("from");
        if (chat == null || chat.get("id") == null) return;

        String chatId = String.valueOf(chat.get("id"));
        String username = from == null ? null : stringValue(from.get("username"));
        String fullName = resolveFullName(from);

        TelegramSubscriber subscriber = telegramSubscriberRepository.findByPhone(phone)
                .orElseGet(() -> telegramSubscriberRepository.findByChatId(chatId)
                        .orElseGet(TelegramSubscriber::new));
        subscriber.setPhone(phone);
        subscriber.setChatId(chatId);
        subscriber.setTelegramUsername(username);
        subscriber.setTelegramFullName(fullName);
        telegramSubscriberRepository.save(subscriber);
        log.info("Linked Telegram chat {} to phone {}", chatId, phone);
    }

    private String resolveFullName(Map<String, Object> from) {
        if (from == null) return null;
        String first = stringValue(from.get("first_name"));
        String last = stringValue(from.get("last_name"));
        return (first + " " + last).trim();
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String normalizePhone(String phone) {
        String cleaned = phone == null ? "" : phone.replaceAll("[^0-9+]", "");
        if (cleaned.startsWith("+84")) return "0" + cleaned.substring(3);
        if (cleaned.startsWith("84") && cleaned.length() > 9) return "0" + cleaned.substring(2);
        return cleaned;
    }
}
