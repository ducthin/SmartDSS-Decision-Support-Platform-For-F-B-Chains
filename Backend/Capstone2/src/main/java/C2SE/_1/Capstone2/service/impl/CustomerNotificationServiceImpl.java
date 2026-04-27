package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.NotificationTestResultDTO;
import C2SE._1.Capstone2.entity.CustomerLoyaltyAccount;
import C2SE._1.Capstone2.entity.Event;
import C2SE._1.Capstone2.entity.HolidayCalendar;
import C2SE._1.Capstone2.entity.TelegramSubscriber;
import C2SE._1.Capstone2.entity.Voucher;
import C2SE._1.Capstone2.repository.CustomerLoyaltyAccountRepository;
import C2SE._1.Capstone2.repository.TelegramSubscriberRepository;
import C2SE._1.Capstone2.service.CustomerNotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class CustomerNotificationServiceImpl implements CustomerNotificationService {

    private final CustomerLoyaltyAccountRepository customerLoyaltyAccountRepository;
    private final TelegramSubscriberRepository telegramSubscriberRepository;
    private final RestTemplate notificationRestTemplate;

    @Value("${app.notification.enabled:false}")
    private boolean notificationEnabled;

    @Value("${app.notification.provider:LOG}")
    private String provider;

    @Value("${app.notification.channel:ZALO}")
    private String channel;

    @Value("${app.notification.webhook-url:}")
    private String webhookUrl;

    @Value("${app.notification.api-key:}")
    private String apiKey;

    @Value("${app.notification.store-name:SmartDSS Coffee}")
    private String storeName;

    @Value("${app.notification.esms.secret-key:}")
    private String esmsSecretKey;

    @Value("${app.notification.esms.brandname:}")
    private String esmsBrandname;

    @Value("${app.notification.esms.sms-type:2}")
    private String esmsSmsType;

    @Value("${app.notification.esms.sandbox:0}")
    private String esmsSandbox;

    @Value("${app.notification.speedsms.access-token:}")
    private String speedSmsAccessToken;

    @Value("${app.notification.speedsms.sms-type:2}")
    private Integer speedSmsType;

    @Value("${app.notification.speedsms.sender:}")
    private String speedSmsSender;

    @Value("${app.notification.infobip.base-url:}")
    private String infobipBaseUrl;

    @Value("${app.notification.infobip.api-key:}")
    private String infobipApiKey;

    @Value("${app.notification.infobip.sender:InfoSMS}")
    private String infobipSender;

    @Value("${app.notification.twilio.account-sid:}")
    private String twilioAccountSid;

    @Value("${app.notification.twilio.auth-token:}")
    private String twilioAuthToken;

    @Value("${app.notification.twilio.from:}")
    private String twilioFrom;

    @Value("${app.notification.twilio.messaging-service-sid:}")
    private String twilioMessagingServiceSid;

    @Value("${app.notification.stringee.base-url:https://api.stringeex.com}")
    private String stringeeBaseUrl;

    @Value("${app.notification.stringee.auth-token:}")
    private String stringeeAuthToken;

    @Value("${app.notification.stringee.api-key-sid:}")
    private String stringeeApiKeySid;

    @Value("${app.notification.stringee.api-key-secret:}")
    private String stringeeApiKeySecret;

    @Value("${app.notification.stringee.sms-sender-id:}")
    private String stringeeSmsSenderId;

    @Value("${app.notification.telegram.bot-token:}")
    private String telegramBotToken;

    @Value("${app.notification.telegram.chat-id:}")
    private String telegramDefaultChatId;

    public CustomerNotificationServiceImpl(
            CustomerLoyaltyAccountRepository customerLoyaltyAccountRepository,
            TelegramSubscriberRepository telegramSubscriberRepository,
            @Qualifier("notificationRestTemplate") RestTemplate notificationRestTemplate
    ) {
        this.customerLoyaltyAccountRepository = customerLoyaltyAccountRepository;
        this.telegramSubscriberRepository = telegramSubscriberRepository;
        this.notificationRestTemplate = notificationRestTemplate;
    }

    @Override
    public void notifyTierVoucherIssued(String phone, Voucher voucher, String tierLabel) {
        if (!StringUtils.hasText(phone) || voucher == null) {
            return;
        }
        String message = "%s: Chúc mừng quý khách đạt hạng %s! Mã ưu đãi của bạn: %s, giảm %s%s, hiệu lực đến %s."
                .formatted(
                        storeName,
                        tierLabel,
                        voucher.getCode(),
                        formatDiscount(voucher),
                        voucher.getMaxDiscountAmount() == null ? "" : " (tối đa " + formatMoney(voucher.getMaxDiscountAmount()) + ")",
                        voucher.getValidTo() == null ? "khi thông báo" : voucher.getValidTo().toLocalDate()
                );
        send(phone, message, "TIER_VOUCHER", voucher.getCode());
    }

    @Override
    public void notifyPromotionVoucher(Voucher voucher) {
        if (voucher == null || !Boolean.TRUE.equals(voucher.getActive()) || StringUtils.hasText(voucher.getCustomerPhone())) {
            return;
        }
        String message = "%s có voucher mới %s: giảm %s%s. Nhập mã khi thanh toán để nhận ưu đãi."
                .formatted(
                        storeName,
                        voucher.getCode(),
                        formatDiscount(voucher),
                        voucher.getMaxDiscountAmount() == null ? "" : " tối đa " + formatMoney(voucher.getMaxDiscountAmount())
                );
        broadcast(message, "PROMOTION_VOUCHER", voucher.getCode());
    }

    @Override
    public void notifyEventPromotion(Event event) {
        if (event == null || !Boolean.TRUE.equals(event.getActive()) || !hasDiscount(event.getDiscountPercent())) {
            return;
        }
        String message = "%s có khuyến mãi sự kiện %s: giảm %s%% từ %s đến %s."
                .formatted(storeName, event.getName(), event.getDiscountPercent(), event.getStartDate(), event.getEndDate());
        broadcast(message, "EVENT_PROMOTION", String.valueOf(event.getId()));
    }

    @Override
    public void notifyHolidayPromotion(HolidayCalendar holiday) {
        if (holiday == null || !hasDiscount(holiday.getDiscountPercent())) {
            return;
        }
        String message = "%s có ưu đãi ngày %s: giảm %s%% vào %s."
                .formatted(storeName, holiday.getName(), holiday.getDiscountPercent(), holiday.getHolidayDate());
        broadcast(message, "HOLIDAY_PROMOTION", String.valueOf(holiday.getId()));
    }

    @Override
    public NotificationTestResultDTO sendTestNotification(String phone, String message) {
        String content = StringUtils.hasText(message)
                ? message.trim()
                : "%s test SMS: hệ thống gửi voucher/khuyến mãi tự động đã sẵn sàng.".formatted(storeName);
        return send(phone, content, "TEST_NOTIFICATION", "manual");
    }

    private void broadcast(String message, String type, String ref) {
        List<CustomerLoyaltyAccount> accounts = customerLoyaltyAccountRepository.findByTotalOrdersGreaterThan(
                0,
                Sort.by(Sort.Order.desc("lastOrderAt"), Sort.Order.desc("updatedAt"))
        );
        for (CustomerLoyaltyAccount account : accounts) {
            send(account.getPhone(), message, type, ref);
        }
    }

    private NotificationTestResultDTO send(String phone, String message, String type, String ref) {
        if (!StringUtils.hasText(phone) || !StringUtils.hasText(message)) {
            return buildResult(false, phone, "Thiếu số điện thoại hoặc nội dung tin nhắn");
        }
        if (!notificationEnabled) {
            log.info("[{} notification disabled] phone={}, type={}, ref={}, message={}", provider, phone, type, ref, message);
            return buildResult(false, phone, "Notification đang tắt: APP_NOTIFICATION_ENABLED=false");
        }

        try {
            if ("ESMS".equalsIgnoreCase(provider)) {
                return sendViaEsms(phone, message, type, ref);
            }
            if ("SPEEDSMS".equalsIgnoreCase(provider)) {
                return sendViaSpeedSms(phone, message, type, ref);
            }
            if ("INFOBIP".equalsIgnoreCase(provider)) {
                return sendViaInfobip(phone, message, type, ref);
            }
            if ("TWILIO".equalsIgnoreCase(provider)) {
                return sendViaTwilio(phone, message, type, ref);
            }
            if ("STRINGEE".equalsIgnoreCase(provider)) {
                return sendViaStringee(phone, message, type, ref);
            }
            if ("TELEGRAM".equalsIgnoreCase(provider)) {
                return sendViaTelegram(phone, message, type, ref);
            }
            if (!StringUtils.hasText(webhookUrl)) {
                log.info("[{} notification webhook missing] phone={}, type={}, ref={}, message={}", provider, phone, type, ref, message);
                return buildResult(false, phone, "Thiếu APP_NOTIFICATION_WEBHOOK_URL cho provider " + provider);
            }
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("provider", provider);
            payload.put("channel", channel);
            payload.put("phone", phone);
            payload.put("message", message);
            payload.put("type", type);
            payload.put("ref", ref);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (StringUtils.hasText(apiKey)) {
                headers.setBearerAuth(apiKey.trim());
            }
            ResponseEntity<String> response = notificationRestTemplate.postForEntity(webhookUrl, new HttpEntity<>(payload, headers), String.class);
            return buildResult(response.getStatusCode().is2xxSuccessful() && isProviderSuccess(response.getBody()), phone, response.getBody());
        } catch (RestClientException ex) {
            log.warn("Không gửi được thông báo {} tới {}: {}", type, phone, ex.getMessage());
            return buildResult(false, phone, ex.getMessage());
        }
    }

    private NotificationTestResultDTO sendViaEsms(String phone, String message, String type, String ref) {
        if (!StringUtils.hasText(apiKey) || !StringUtils.hasText(esmsSecretKey)) {
            log.info("[ESMS config missing] phone={}, type={}, ref={}, message={}", phone, type, ref, message);
            return buildResult(false, phone, "Thiếu APP_NOTIFICATION_API_KEY hoặc ESMS_SECRET_KEY");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("ApiKey", apiKey.trim());
        payload.put("SecretKey", esmsSecretKey.trim());
        payload.put("Phone", normalizePhone(phone));
        payload.put("Content", message);
        payload.put("SmsType", esmsSmsType);
        payload.put("IsUnicode", "1");
        payload.put("Sandbox", esmsSandbox);
        payload.put("RequestId", "%s-%s-%s".formatted(type, ref, System.currentTimeMillis()));
        if (StringUtils.hasText(esmsBrandname)) {
            payload.put("Brandname", esmsBrandname.trim());
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<String> response = notificationRestTemplate.postForEntity(resolveEsmsUrl(), new HttpEntity<>(payload, headers), String.class);
        return buildResult(response.getStatusCode().is2xxSuccessful() && isProviderSuccess(response.getBody()), phone, response.getBody());
    }

    private NotificationTestResultDTO sendViaSpeedSms(String phone, String message, String type, String ref) {
        if (!StringUtils.hasText(speedSmsAccessToken)) {
            log.info("[SpeedSMS config missing] phone={}, type={}, ref={}, message={}", phone, type, ref, message);
            return buildResult(false, phone, "Thiếu SPEEDSMS_ACCESS_TOKEN");
        }
        if (requiresSpeedSmsSender() && !StringUtils.hasText(resolveSpeedSmsSender())) {
            return buildResult(false, phone, "SpeedSMS type=%s cần sender/brandname hợp lệ. Với type=4 thử SPEEDSMS_SENDER=Notify hoặc Verify; type=3 cần brandname đã đăng ký.".formatted(speedSmsType));
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("to", List.of(normalizePhoneForSpeedSms(phone)));
        payload.put("content", encodeNonAsciiCharacters(message));
        payload.put("type", speedSmsType);
        String sender = resolveSpeedSmsSender();
        if (StringUtils.hasText(sender)) {
            payload.put("brandname", sender);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + Base64.getEncoder()
                .encodeToString((speedSmsAccessToken.trim() + ":x").getBytes(StandardCharsets.UTF_8)));

        ResponseEntity<String> response = notificationRestTemplate.postForEntity(resolveSpeedSmsUrl(), new HttpEntity<>(payload, headers), String.class);
        String detail = "SpeedSMS request: type=%s, to=%s, brandname=%s. Response: %s"
                .formatted(speedSmsType, payload.get("to"), payload.getOrDefault("brandname", "(none)"), response.getBody());
        return buildResult(response.getStatusCode().is2xxSuccessful() && isProviderSuccess(response.getBody()), phone, detail);
    }

    private NotificationTestResultDTO sendViaInfobip(String phone, String message, String type, String ref) {
        if (!StringUtils.hasText(infobipBaseUrl) || !StringUtils.hasText(infobipApiKey)) {
            log.info("[Infobip config missing] phone={}, type={}, ref={}, message={}", phone, type, ref, message);
            return buildResult(false, phone, "Thiếu INFOBIP_BASE_URL hoặc INFOBIP_API_KEY");
        }
        if (!StringUtils.hasText(infobipSender)) {
            return buildResult(false, phone, "Thiếu INFOBIP_SENDER");
        }

        Map<String, Object> destination = new LinkedHashMap<>();
        destination.put("to", normalizePhoneForInfobip(phone));

        Map<String, Object> content = new LinkedHashMap<>();
        content.put("text", message);

        Map<String, Object> sms = new LinkedHashMap<>();
        sms.put("sender", infobipSender.trim());
        sms.put("destinations", List.of(destination));
        sms.put("content", content);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("messages", List.of(sms));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set(HttpHeaders.AUTHORIZATION, "App " + infobipApiKey.trim());

        ResponseEntity<String> response = notificationRestTemplate.postForEntity(resolveInfobipSmsUrl(), new HttpEntity<>(payload, headers), String.class);
        return buildResult(response.getStatusCode().is2xxSuccessful() && isProviderSuccess(response.getBody()), phone, response.getBody());
    }

    private NotificationTestResultDTO sendViaTwilio(String phone, String message, String type, String ref) {
        if (!StringUtils.hasText(twilioAccountSid) || !StringUtils.hasText(twilioAuthToken)) {
            log.info("[Twilio config missing] phone={}, type={}, ref={}, message={}", phone, type, ref, message);
            return buildResult(false, phone, "Thiếu TWILIO_ACCOUNT_SID hoặc TWILIO_AUTH_TOKEN");
        }
        if (!StringUtils.hasText(twilioFrom) && !StringUtils.hasText(twilioMessagingServiceSid)) {
            return buildResult(false, phone, "Thiếu TWILIO_FROM hoặc TWILIO_MESSAGING_SERVICE_SID");
        }

        MultiValueMap<String, String> payload = new LinkedMultiValueMap<>();
        payload.add("To", normalizePhoneForE164(phone));
        payload.add("Body", message);
        if (StringUtils.hasText(twilioMessagingServiceSid)) {
            payload.add("MessagingServiceSid", twilioMessagingServiceSid.trim());
        } else {
            payload.add("From", twilioFrom.trim());
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + Base64.getEncoder()
                .encodeToString((twilioAccountSid.trim() + ":" + twilioAuthToken.trim()).getBytes(StandardCharsets.UTF_8)));

        ResponseEntity<String> response = notificationRestTemplate.postForEntity(resolveTwilioMessagesUrl(), new HttpEntity<>(payload, headers), String.class);
        return buildResult(response.getStatusCode().is2xxSuccessful() && isProviderSuccess(response.getBody()), phone, response.getBody());
    }

    private NotificationTestResultDTO sendViaStringee(String phone, String message, String type, String ref) {
        String authToken = resolveStringeeAuthToken();
        if (!StringUtils.hasText(authToken)) {
            return buildResult(false, phone, "Thiếu STRINGEE_AUTH_TOKEN hoặc STRINGEE_API_KEY_SID/STRINGEE_API_KEY_SECRET");
        }
        if (!StringUtils.hasText(stringeeSmsSenderId)) {
            return buildResult(false, phone, "Thiếu STRINGEE_SMS_SENDER_ID (senderId đại diện brandname do Stringee cấp)");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("senderId", parseStringeeSenderId());
        payload.put("to", normalizePhoneForSpeedSms(phone));
        payload.put("content", message);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set("X-STRINGEE-AUTH", authToken);

        ResponseEntity<String> response = notificationRestTemplate.postForEntity(resolveStringeeSmsUrl(), new HttpEntity<>(payload, headers), String.class);
        String detail = "Stringee request: senderId=%s, to=%s. Response: %s"
                .formatted(payload.get("senderId"), payload.get("to"), response.getBody());
        return buildResult(response.getStatusCode().is2xxSuccessful() && isProviderSuccess(response.getBody()), phone, detail);
    }

    private NotificationTestResultDTO sendViaTelegram(String phone, String message, String type, String ref) {
        if (!StringUtils.hasText(telegramBotToken)) {
            return buildResult(false, phone, "Thiếu TELEGRAM_BOT_TOKEN");
        }
        String normalizedPhone = normalizePhone(phone);
        String chatId = telegramSubscriberRepository.findByPhone(normalizedPhone)
                .map(TelegramSubscriber::getChatId)
                .orElse(telegramDefaultChatId);
        if (!StringUtils.hasText(chatId)) {
            return buildResult(false, phone, "SĐT này chưa liên kết Telegram. Khách cần bấm link bot trên trang QR trước.");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("chat_id", chatId.trim());
        payload.put("text", message);
        payload.put("disable_web_page_preview", true);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<String> response = notificationRestTemplate.postForEntity(resolveTelegramSendMessageUrl(), new HttpEntity<>(payload, headers), String.class);
        return buildResult(response.getStatusCode().is2xxSuccessful() && isProviderSuccess(response.getBody()), phone, response.getBody());
    }

    private NotificationTestResultDTO buildResult(boolean sent, String phone, String detail) {
        return NotificationTestResultDTO.builder()
                .sent(sent)
                .provider(provider)
                .phone(normalizePhone(phone))
                .detail(detail)
                .build();
    }

    private boolean isProviderSuccess(String responseBody) {
        if (!StringUtils.hasText(responseBody)) {
            return true;
        }
        String normalized = responseBody.toLowerCase();
        if ("ESMS".equalsIgnoreCase(provider)) {
            return normalized.contains("\"coderesult\":\"100\"") || normalized.contains("\"coderesult\":100");
        }
        if ("SPEEDSMS".equalsIgnoreCase(provider)) {
            return normalized.contains("\"status\":\"success\"");
        }
        if ("INFOBIP".equalsIgnoreCase(provider)) {
            return normalized.contains("\"status\"") && !normalized.contains("\"groupid\":5");
        }
        if ("TWILIO".equalsIgnoreCase(provider)) {
            return normalized.contains("\"sid\"") && !normalized.contains("\"error_code\"");
        }
        if ("STRINGEE".equalsIgnoreCase(provider)) {
            return normalized.contains("\"r\":0") || normalized.contains("\"r\" : 0");
        }
        if ("TELEGRAM".equalsIgnoreCase(provider)) {
            return normalized.contains("\"ok\":true");
        }
        return !normalized.contains("error") && !normalized.contains("fail");
    }

    private String resolveEsmsUrl() {
        if (StringUtils.hasText(webhookUrl)) {
            return webhookUrl.trim();
        }
        return "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/";
    }

    private String resolveSpeedSmsUrl() {
        if (StringUtils.hasText(webhookUrl)) {
            return webhookUrl.trim();
        }
        return "https://api.speedsms.vn/index.php/sms/send";
    }

    private String resolveInfobipSmsUrl() {
        String base = infobipBaseUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/sms/3/messages";
    }

    private String resolveTwilioMessagesUrl() {
        return "https://api.twilio.com/2010-04-01/Accounts/" + twilioAccountSid.trim() + "/Messages.json";
    }

    private String resolveStringeeSmsUrl() {
        String base = stringeeBaseUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/v1/sms/send";
    }

    private String resolveTelegramSendMessageUrl() {
        return "https://api.telegram.org/bot" + telegramBotToken.trim() + "/sendMessage";
    }

    private Number parseStringeeSenderId() {
        try {
            return Long.parseLong(stringeeSmsSenderId.trim());
        } catch (NumberFormatException ex) {
            return 0L;
        }
    }

    private String resolveStringeeAuthToken() {
        if (StringUtils.hasText(stringeeAuthToken)) {
            return stringeeAuthToken.trim();
        }
        if (!StringUtils.hasText(stringeeApiKeySid) || !StringUtils.hasText(stringeeApiKeySecret)) {
            return "";
        }
        try {
            return createStringeeJwt();
        } catch (Exception ex) {
            log.warn("Không tạo được Stringee JWT: {}", ex.getMessage());
            return "";
        }
    }

    private String createStringeeJwt() throws Exception {
        String header = base64UrlJson("""
                {"typ":"JWT","alg":"HS256","cty":"stringee-api;v=1"}
                """);
        long now = Instant.now().getEpochSecond();
        String payload = base64UrlJson("""
                {"jti":"%s-%s","iss":"%s","exp":%s,"rest_api":true}
                """.formatted(stringeeApiKeySid.trim(), now, stringeeApiKeySid.trim(), now + 3600));
        String data = header + "." + payload;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(stringeeApiKeySecret.trim().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        return data + "." + signature;
    }

    private String base64UrlJson(String json) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(json.strip().getBytes(StandardCharsets.UTF_8));
    }

    private boolean requiresSpeedSmsSender() {
        return Integer.valueOf(3).equals(speedSmsType) || Integer.valueOf(4).equals(speedSmsType) || Integer.valueOf(5).equals(speedSmsType);
    }

    private String resolveSpeedSmsSender() {
        if (Integer.valueOf(2).equals(speedSmsType)) {
            return "";
        }
        if (StringUtils.hasText(speedSmsSender)) {
            return speedSmsSender.trim();
        }
        if (Integer.valueOf(4).equals(speedSmsType)) {
            return "Notify";
        }
        return "";
    }

    private String encodeNonAsciiCharacters(String value) {
        if (value == null) {
            return "";
        }
        StringBuilder encoded = new StringBuilder();
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c > 127) {
                encoded.append("\\u").append(String.format("%04x", (int) c));
            } else {
                encoded.append(c);
            }
        }
        return encoded.toString();
    }

    private String normalizePhone(String phone) {
        String cleaned = phone == null ? "" : phone.replaceAll("[^0-9+]", "");
        if (cleaned.startsWith("+84")) {
            return "0" + cleaned.substring(3);
        }
        if (cleaned.startsWith("84") && cleaned.length() > 9) {
            return "0" + cleaned.substring(2);
        }
        return cleaned;
    }

    private String normalizePhoneForInfobip(String phone) {
        String cleaned = normalizePhone(phone);
        if (cleaned.startsWith("0") && cleaned.length() >= 10) {
            return "84" + cleaned.substring(1);
        }
        if (cleaned.startsWith("+")) {
            return cleaned.substring(1);
        }
        return cleaned;
    }

    private String normalizePhoneForSpeedSms(String phone) {
        String cleaned = normalizePhone(phone);
        if (cleaned.startsWith("0") && cleaned.length() >= 10) {
            return "84" + cleaned.substring(1);
        }
        if (cleaned.startsWith("+")) {
            return cleaned.substring(1);
        }
        return cleaned;
    }

    private String normalizePhoneForE164(String phone) {
        String cleaned = normalizePhone(phone);
        if (cleaned.startsWith("0") && cleaned.length() >= 10) {
            return "+84" + cleaned.substring(1);
        }
        if (cleaned.startsWith("84")) {
            return "+" + cleaned;
        }
        if (cleaned.startsWith("+")) {
            return cleaned;
        }
        return "+" + cleaned;
    }

    private boolean hasDiscount(BigDecimal discountPercent) {
        return discountPercent != null && discountPercent.compareTo(BigDecimal.ZERO) > 0;
    }

    private String formatDiscount(Voucher voucher) {
        if (voucher.getDiscountType() == Voucher.DiscountType.PERCENT) {
            return voucher.getDiscountValue().stripTrailingZeros().toPlainString() + "%";
        }
        return formatMoney(voucher.getDiscountValue());
    }

    private String formatMoney(BigDecimal value) {
        if (value == null) {
            return "0đ";
        }
        return String.format("%,.0fđ", value).replace(',', '.');
    }
}
