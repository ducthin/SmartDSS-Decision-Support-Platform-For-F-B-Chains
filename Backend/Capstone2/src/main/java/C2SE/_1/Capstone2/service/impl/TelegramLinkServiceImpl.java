package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.TelegramLinkStatusDTO;
import C2SE._1.Capstone2.entity.TelegramSubscriber;
import C2SE._1.Capstone2.repository.TelegramSubscriberRepository;
import C2SE._1.Capstone2.service.TelegramLinkService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramLinkServiceImpl implements TelegramLinkService {

    private final TelegramSubscriberRepository telegramSubscriberRepository;
    private final RestTemplate notificationRestTemplate;

    @Value("${app.notification.telegram.bot-username:}")
    private String botUsername;

    @Value("${app.notification.telegram.bot-token:}")
    private String botToken;

    @Value("${app.notification.store-name:SmartDSS Coffee}")
    private String storeName;

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
            sendTelegramMessage(chatIdFromMessage(message),
                    "Xin chào! Vui lòng mở lại liên kết từ website/quầy để liên kết số điện thoại và nhận ưu đãi.");
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

        TelegramSubscriber byChatId = telegramSubscriberRepository.findByChatId(chatId).orElse(null);
        TelegramSubscriber byPhone = telegramSubscriberRepository.findByPhone(phone).orElse(null);

        TelegramSubscriber subscriber;
        if (byChatId != null && byPhone != null && !Objects.equals(byChatId.getId(), byPhone.getId())) {
            // Merge duplicated rows: keep chat-bound record, drop phone-bound duplicate.
            telegramSubscriberRepository.delete(byPhone);
            telegramSubscriberRepository.flush();
            subscriber = byChatId;
        } else if (byChatId != null) {
            subscriber = byChatId;
        } else if (byPhone != null) {
            subscriber = byPhone;
        } else {
            subscriber = new TelegramSubscriber();
        }

        subscriber.setPhone(phone);
        subscriber.setChatId(chatId);
        subscriber.setTelegramUsername(username);
        subscriber.setTelegramFullName(fullName);
        persistSubscriberWithConflictFallback(subscriber, chatId, phone, username, fullName);
        log.info("Linked Telegram chat {} to phone {}", chatId, phone);
        sendTelegramMessage(chatId,
                "Đã liên kết Telegram thành công với số " + phone + ".\n"
                        + "Từ bây giờ " + storeName + " sẽ gửi ưu đãi và voucher mới tại đây.");
    }

    private void persistSubscriberWithConflictFallback(
            TelegramSubscriber subscriber,
            String chatId,
            String phone,
            String username,
            String fullName
    ) {
        try {
            telegramSubscriberRepository.save(subscriber);
            telegramSubscriberRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            log.warn("Telegram link conflict chatId={}, phone={}. Retrying with chat-bound merge", chatId, phone);
            TelegramSubscriber chatBound = telegramSubscriberRepository.findByChatId(chatId).orElse(null);
            TelegramSubscriber phoneBound = telegramSubscriberRepository.findByPhone(phone).orElse(null);

            TelegramSubscriber resolved;
            if (chatBound != null) {
                if (phoneBound != null && !Objects.equals(chatBound.getId(), phoneBound.getId())) {
                    telegramSubscriberRepository.delete(phoneBound);
                    telegramSubscriberRepository.flush();
                }
                resolved = chatBound;
            } else if (phoneBound != null) {
                resolved = phoneBound;
            } else {
                throw ex;
            }

            resolved.setPhone(phone);
            resolved.setChatId(chatId);
            resolved.setTelegramUsername(username);
            resolved.setTelegramFullName(fullName);
            telegramSubscriberRepository.save(resolved);
            telegramSubscriberRepository.flush();
        }
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

    @SuppressWarnings("unchecked")
    private String chatIdFromMessage(Map<String, Object> message) {
        if (message == null) return null;
        Map<String, Object> chat = (Map<String, Object>) message.get("chat");
        if (chat == null || chat.get("id") == null) return null;
        return String.valueOf(chat.get("id"));
    }

    private void sendTelegramMessage(String chatId, String text) {
        if (!StringUtils.hasText(chatId) || !StringUtils.hasText(text) || !StringUtils.hasText(botToken)) {
            return;
        }
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("chat_id", chatId.trim());
            payload.put("text", text);
            payload.put("disable_web_page_preview", true);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            notificationRestTemplate.postForEntity(
                    "https://api.telegram.org/bot" + botToken.trim() + "/sendMessage",
                    new HttpEntity<>(payload, headers),
                    String.class
            );
        } catch (Exception ex) {
            log.warn("Cannot send Telegram start confirmation to {}: {}", chatId, ex.getMessage());
        }
    }
}
