package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.NotificationTestResultDTO;
import C2SE._1.Capstone2.entity.CustomerLoyaltyAccount;
import C2SE._1.Capstone2.entity.Event;
import C2SE._1.Capstone2.entity.HolidayCalendar;
import C2SE._1.Capstone2.entity.Voucher;
import C2SE._1.Capstone2.repository.CustomerLoyaltyAccountRepository;
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
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class CustomerNotificationServiceImpl implements CustomerNotificationService {

    private final CustomerLoyaltyAccountRepository customerLoyaltyAccountRepository;
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

    public CustomerNotificationServiceImpl(
            CustomerLoyaltyAccountRepository customerLoyaltyAccountRepository,
            @Qualifier("notificationRestTemplate") RestTemplate notificationRestTemplate
    ) {
        this.customerLoyaltyAccountRepository = customerLoyaltyAccountRepository;
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

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("to", List.of(normalizePhone(phone)));
        payload.put("content", message);
        payload.put("sms_type", speedSmsType);
        payload.put("sender", resolveSpeedSmsSender());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + Base64.getEncoder()
                .encodeToString((speedSmsAccessToken.trim() + ":x").getBytes(StandardCharsets.UTF_8)));

        ResponseEntity<String> response = notificationRestTemplate.postForEntity(resolveSpeedSmsUrl(), new HttpEntity<>(payload, headers), String.class);
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
