package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.PaymentStatusDTO;
import C2SE._1.Capstone2.dto.PaymentWebhookDTO;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.payos.PayOS;
import vn.payos.model.webhooks.WebhookData;

import java.math.BigDecimal;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/v1/public/payments")
@RequiredArgsConstructor
public class PaymentWebhookController {

    private static final Logger log = LoggerFactory.getLogger(PaymentWebhookController.class);

    private final PaymentService paymentService;
    private static final Pattern BILL_ID_PATTERN = Pattern.compile("BILL-(\\d+)");
    @Value("${app.payment.payos.client-id:}")
    private String payosClientId;
    @Value("${app.payment.payos.api-key:}")
    private String payosApiKey;
    @Value("${app.payment.payos.checksum-key:}")
    private String payosChecksumKey;

    @PostMapping("/webhook")
    public ResponseEntity<ApiResponse<?>> webhook(
            @RequestBody(required = false) Map<String, Object> payload,
            @RequestHeader(name = "X-Payment-Webhook-Secret", required = false) String webhookSecretHeader) {
        log.debug("Received generic webhook payload: {}", payload == null ? "null" : payload.keySet());
        // Provider dashboards often send a "probe" request to validate webhook URL.
        // Return 200 so the URL can be registered even when no payment event is included.
        if (payload == null || !payload.containsKey("orderId") || !payload.containsKey("status")) {
            log.info("Generic webhook probe accepted");
            return ResponseEntity.ok(ApiResponse.success(Map.of("ack", true, "message", "webhook url is reachable")));
        }

        PaymentWebhookDTO webhookDTO = PaymentWebhookDTO.builder()
                .orderId(parseLong(payload.get("orderId")))
                .status(parseString(payload.get("status")))
                .amount(parseBigDecimal(payload.get("amount")))
                .transferContent(parseString(payload.get("transferContent")))
                .providerTransactionId(parseString(payload.get("providerTransactionId")))
                .build();

        log.info("Processing generic webhook for orderId={}, status={}", webhookDTO.getOrderId(), webhookDTO.getStatus());
        PaymentStatusDTO result = paymentService.handleWebhook(webhookDTO, webhookSecretHeader);
        log.info("Generic webhook processed for orderId={}, paymentStatus={}", result.getOrderId(), result.getStatus());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/payos/webhook")
    public ResponseEntity<ApiResponse<?>> payosWebhook(
            @RequestBody(required = false) Map<String, Object> payload) {
        log.debug("Received PayOS webhook payload: {}", payload == null ? "null" : payload.keySet());
        // PayOS may send a webhook probe before actual payment events.
        if (payload == null || !payload.containsKey("data")) {
            log.info("PayOS webhook probe accepted");
            return ResponseEntity.ok(ApiResponse.success(Map.of("ack", true, "message", "payos webhook url is reachable")));
        }

        Map<String, Object> data = extractVerifiedPayosData(payload);
        if (data == null || data.isEmpty()) {
            log.warn("PayOS webhook has empty data after verification");
            return ResponseEntity.ok(ApiResponse.success(Map.of("ack", true, "message", "payos webhook payload has no data")));
        }

        Long orderId = parseOrderIdFromPayos(payload, data);
        if (orderId == null) {
            log.warn("PayOS webhook missing order mapping. dataKeys={}", data.keySet());
            return ResponseEntity.ok(ApiResponse.success(Map.of("ack", true, "message", "payos payload missing order mapping")));
        }

        String status = resolvePayosStatus(payload, data);
        PaymentWebhookDTO webhookDTO = PaymentWebhookDTO.builder()
                .orderId(orderId)
                .status(status)
                .amount(parseBigDecimal(data.get("amount")))
                .transferContent(parseString(data.get("description")))
                .providerTransactionId(resolveProviderTransactionId(data))
                .build();

        log.info("Processing PayOS webhook for orderId={}, resolvedStatus={}, providerTx={}",
                webhookDTO.getOrderId(), webhookDTO.getStatus(), webhookDTO.getProviderTransactionId());
        try {
            PaymentStatusDTO result = paymentService.handleProviderWebhook(webhookDTO);
            log.info("PayOS webhook processed for orderId={}, paymentStatus={}", result.getOrderId(), result.getStatus());
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (BadRequestException ex) {
            // Provider test events may not map to a real local order.
            // Return 200 to avoid webhook URL registration failure/retry loops.
            log.warn("PayOS webhook ignored: {}", ex.getMessage());
            return ResponseEntity.ok(ApiResponse.success(Map.of(
                    "ack", true,
                    "ignored", true,
                    "message", ex.getMessage()
            )));
        }
    }

    private Map<String, Object> extractVerifiedPayosData(Map<String, Object> payload) {
        Map<String, Object> rawData = asMap(payload.get("data"));
        if (!isPayosConfigured()) {
            log.debug("PayOS keys not configured. Skip signature verification");
            return rawData;
        }

        try {
            PayOS payOS = new PayOS(payosClientId.trim(), payosApiKey.trim(), payosChecksumKey.trim());
            WebhookData verifiedData = payOS.webhooks().verify(payload);
            log.debug("PayOS webhook signature verification success");
            if (verifiedData == null) {
                return rawData;
            }
            return toMapFromVerifiedData(verifiedData, rawData);
        } catch (RuntimeException ex) {
            log.warn("PayOS webhook signature verification failed");
            throw new BadRequestException("Chữ ký webhook PayOS không hợp lệ");
        }
    }

    private Long parseLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.longValue();
        return Long.parseLong(String.valueOf(value));
    }

    private BigDecimal parseBigDecimal(Object value) {
        if (value == null) return null;
        if (value instanceof BigDecimal decimal) return decimal;
        if (value instanceof Number number) return BigDecimal.valueOf(number.doubleValue());
        return new BigDecimal(String.valueOf(value));
    }

    private String parseString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return null;
    }

    private Long parseOrderIdFromPayos(Map<String, Object> root, Map<String, Object> data) {
        Long byOrderCode = parseLong(data.get("orderCode"));
        if (byOrderCode != null) return byOrderCode;

        String desc = parseString(data.get("description"));
        Long byDesc = parseOrderIdFromDescription(desc);
        if (byDesc != null) return byDesc;

        String transferContent = parseString(root.get("transferContent"));
        return parseOrderIdFromDescription(transferContent);
    }

    private Long parseOrderIdFromDescription(String description) {
        if (description == null || description.isBlank()) return null;
        Matcher matcher = BILL_ID_PATTERN.matcher(description.toUpperCase());
        if (matcher.find()) {
            return Long.parseLong(matcher.group(1));
        }
        return null;
    }

    private String resolvePayosStatus(Map<String, Object> root, Map<String, Object> data) {
        String code = parseString(data.get("code"));
        if (code == null || code.isBlank()) {
            code = parseString(root.get("code"));
        }
        String status = parseString(data.get("status"));
        if (status == null || status.isBlank()) {
            status = parseString(root.get("status"));
        }
        boolean success = Boolean.parseBoolean(String.valueOf(root.getOrDefault("success", "false")));

        if ("00".equals(code) || "PAID".equalsIgnoreCase(status) || success) {
            return "PAID";
        }
        return "FAILED";
    }

    private String resolveProviderTransactionId(Map<String, Object> data) {
        String value = parseString(data.get("reference"));
        if (value != null && !value.isBlank()) return value;
        value = parseString(data.get("paymentLinkId"));
        if (value != null && !value.isBlank()) return value;
        return parseString(data.get("transactionDateTime"));
    }

    private boolean isPayosConfigured() {
        return payosClientId != null && !payosClientId.isBlank()
                && payosApiKey != null && !payosApiKey.isBlank()
                && payosChecksumKey != null && !payosChecksumKey.isBlank();
    }

    private Map<String, Object> toMapFromVerifiedData(WebhookData data, Map<String, Object> fallbackRawData) {
        Long amount = data.getAmount();
        String paymentLinkId = data.getPaymentLinkId();
        String reference = data.getReference();
        String txDateTime = data.getTransactionDateTime();

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("orderCode", data.getOrderCode());
        result.put("amount", amount == null ? parseBigDecimal(fallbackRawData == null ? null : fallbackRawData.get("amount")) : BigDecimal.valueOf(amount));
        result.put("description", data.getDescription());
        result.put("code", data.getCode());
        result.put("paymentLinkId", paymentLinkId);
        result.put("reference", reference);
        result.put("transactionDateTime", txDateTime);
        return result;
    }
}
