package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.PaymentInitDTO;
import C2SE._1.Capstone2.dto.PaymentStatusDTO;
import C2SE._1.Capstone2.dto.PaymentWebhookDTO;
import C2SE._1.Capstone2.entity.Order;
import C2SE._1.Capstone2.entity.OrderStatus;
import C2SE._1.Capstone2.entity.SalesTransaction;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.repository.OrderRepository;
import C2SE._1.Capstone2.repository.SalesTransactionRepository;
import C2SE._1.Capstone2.service.PaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentServiceImpl implements PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentServiceImpl.class);

    private final OrderRepository orderRepository;
    private final SalesTransactionRepository salesTransactionRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${app.payment.bank.bin:970422}")
    private String bankBin;
    @Value("${app.payment.bank.account:0123456789}")
    private String bankAccount;
    @Value("${app.payment.bank.account-name:SMARTDSS CAFE}")
    private String bankAccountName;
    @Value("${app.payment.qr.expire-minutes:15}")
    private int qrExpireMinutes;
    @Value("${app.payment.webhook.secret:}")
    private String webhookSecret;
    @Value("${app.payment.payos.client-id:}")
    private String payosClientId;
    @Value("${app.payment.payos.api-key:}")
    private String payosApiKey;
    @Value("${app.payment.payos.checksum-key:}")
    private String payosChecksumKey;
    @Value("${app.payment.payos.return-url:http://localhost:5173/payment/success}")
    private String payosReturnUrl;
    @Value("${app.payment.payos.cancel-url:http://localhost:5173/payment/cancel}")
    private String payosCancelUrl;

    @Override
    public PaymentInitDTO initQrPayment(Long orderId) {
        log.info("Init payment requested for order {}", orderId);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));
        if (order.getStatus() != OrderStatus.COMPLETED) {
            log.warn("Reject init payment for order {} because status is {}", orderId, order.getStatus());
            throw new BadRequestException("Chỉ được thanh toán cho đơn đã COMPLETED");
        }

        SalesTransaction tx = salesTransactionRepository.findByOrderId(orderId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy giao dịch bán hàng của đơn này"));

        if (!isPaid(tx.getPaymentMethod())) {
            tx.setPaymentMethod("PENDING");
            salesTransactionRepository.save(tx);
            log.debug("Marked order {} payment method as PENDING before QR init", orderId);
        }

        BigDecimal amount = tx.getTotalAmount() == null ? BigDecimal.ZERO : tx.getTotalAmount();
        String transferContent = "BILL-" + orderId;
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(Math.max(1, qrExpireMinutes));
        PaymentStatusDTO statusDTO = toStatusDTO(tx);

        PaymentInitDTO payosInit = tryInitPayosPayment(orderId, amount, transferContent, expiresAt, statusDTO);
        if (payosInit != null) {
            log.info("Init payment success with provider PAYOS for order {}", orderId);
            return payosInit;
        }

        String qrImageUrl = buildVietQrImageUrl(amount, transferContent);
        log.info("Init payment fallback to provider VIETQR for order {}", orderId);
        return buildInitResponse(orderId, amount, transferContent, qrImageUrl, null, null, "VIETQR", expiresAt, statusDTO);
    }

    @Override
    public PaymentStatusDTO markCashPaid(Long orderId) {
        log.info("Mark cash paid requested for order {}", orderId);
        SalesTransaction tx = salesTransactionRepository.findByOrderId(orderId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy giao dịch bán hàng của đơn này"));
        tx.setPaymentMethod("CASH");
        tx.setPaidAt(LocalDateTime.now());
        SalesTransaction saved = salesTransactionRepository.save(tx);
        PaymentStatusDTO statusDTO = toStatusDTO(saved);
        broadcastStatus(statusDTO);
        log.info("Marked order {} as CASH paid", orderId);
        return statusDTO;
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentStatusDTO getOrderPaymentStatus(Long orderId) {
        SalesTransaction tx = salesTransactionRepository.findByOrderId(orderId).orElse(null);
        if (tx == null) {
            return PaymentStatusDTO.builder()
                    .orderId(orderId)
                    .status("PENDING")
                    .paymentMethod("PENDING")
                    .build();
        }
        return toStatusDTO(tx);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentStatusDTO> getOrderPaymentStatuses(List<Long> orderIds) {
        if (orderIds == null || orderIds.isEmpty()) {
            return List.of();
        }
        List<SalesTransaction> txList = salesTransactionRepository.findByOrderIdIn(orderIds);
        Map<Long, SalesTransaction> byOrder = new HashMap<>();
        for (SalesTransaction tx : txList) {
            if (tx.getOrder() != null && tx.getOrder().getId() != null) {
                byOrder.put(tx.getOrder().getId(), tx);
            }
        }

        List<PaymentStatusDTO> result = new ArrayList<>();
        for (Long orderId : orderIds) {
            SalesTransaction tx = byOrder.get(orderId);
            if (tx == null) {
                result.add(PaymentStatusDTO.builder()
                        .orderId(orderId)
                        .status("PENDING")
                        .paymentMethod("PENDING")
                        .build());
            } else {
                result.add(toStatusDTO(tx));
            }
        }
        return result;
    }

    @Override
    public PaymentStatusDTO handleWebhook(PaymentWebhookDTO webhookDTO, String webhookSecretHeader) {
        log.debug("Handle generic webhook for orderId={}, status={}, hasAmount={}",
                webhookDTO.getOrderId(), webhookDTO.getStatus(), webhookDTO.getAmount() != null);
        if (webhookSecret != null && !webhookSecret.isBlank()) {
            if (webhookSecretHeader == null || !webhookSecret.equals(webhookSecretHeader)) {
                log.warn("Reject generic webhook due to invalid secret for orderId={}", webhookDTO.getOrderId());
                throw new BadRequestException("Webhook secret không hợp lệ");
            }
        }
        return applyWebhook(webhookDTO);
    }

    @Override
    public PaymentStatusDTO handleProviderWebhook(PaymentWebhookDTO webhookDTO) {
        log.debug("Handle provider webhook for orderId={}, status={}, providerTransactionId={}",
                webhookDTO.getOrderId(), webhookDTO.getStatus(), webhookDTO.getProviderTransactionId());
        return applyWebhook(webhookDTO);
    }

    private PaymentStatusDTO applyWebhook(PaymentWebhookDTO webhookDTO) {
        String providerTxId = normalizeProviderTransactionId(webhookDTO.getProviderTransactionId());
        String status = webhookDTO.getStatus() == null ? "" : webhookDTO.getStatus().trim().toUpperCase(Locale.ROOT);
        log.info("Apply webhook for orderId={}, normalizedStatus={}, providerTransactionId={}",
                webhookDTO.getOrderId(), status, providerTxId);
        SalesTransaction tx = salesTransactionRepository.findByOrderId(webhookDTO.getOrderId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy giao dịch theo orderId"));

        if (!"PAID".equals(status)) {
            log.info("Ignore webhook update because status is not PAID for orderId={}", webhookDTO.getOrderId());
            return toStatusDTO(tx);
        }

        BigDecimal expectedAmount = tx.getTotalAmount() == null ? BigDecimal.ZERO : tx.getTotalAmount();
        if (webhookDTO.getAmount() != null && webhookDTO.getAmount().compareTo(expectedAmount) != 0) {
            log.warn("Reject webhook amount mismatch for orderId={}, expected={}, actual={}",
                    webhookDTO.getOrderId(), expectedAmount, webhookDTO.getAmount());
            throw new BadRequestException("Số tiền thanh toán không khớp hóa đơn");
        }

        // Idempotency: provider may retry the exact same PAID event many times.
        if (isPaid(tx.getPaymentMethod())) {
            String existingProviderTxId = normalizeProviderTransactionId(tx.getProviderTransactionId());
            if ("CASH".equalsIgnoreCase(tx.getPaymentMethod())) {
                log.info("Ignore webhook for orderId={} because order already paid by CASH", webhookDTO.getOrderId());
                return toStatusDTO(tx);
            }
            if (providerTxId == null || existingProviderTxId == null || providerTxId.equals(existingProviderTxId)) {
                log.info("Ignore duplicate PAID webhook for orderId={}, providerTransactionId={}",
                        webhookDTO.getOrderId(), providerTxId);
                return toStatusDTO(tx);
            }
            log.warn("Reject conflicting provider transaction for orderId={}, existingProviderTransactionId={}, incomingProviderTransactionId={}",
                    webhookDTO.getOrderId(), existingProviderTxId, providerTxId);
            throw new BadRequestException("Webhook bị trùng với providerTransactionId khác");
        }

        tx.setPaymentMethod("QR");
        tx.setProviderTransactionId(providerTxId);
        tx.setPaidAt(LocalDateTime.now());
        SalesTransaction saved = salesTransactionRepository.save(tx);
        PaymentStatusDTO statusDTO = toStatusDTO(saved);
        broadcastStatus(statusDTO);
        log.info("Order {} marked as QR paid from webhook, providerTransactionId={}", webhookDTO.getOrderId(), providerTxId);
        return statusDTO;
    }

    private PaymentStatusDTO toStatusDTO(SalesTransaction tx) {
        String method = normalizeMethod(tx.getPaymentMethod());
        return PaymentStatusDTO.builder()
                .orderId(tx.getOrder().getId())
                .status(isPaid(method) ? "PAID" : "PENDING")
                .paymentMethod(method)
                .build();
    }

    private String normalizeMethod(String method) {
        if (method == null || method.isBlank()) {
            return "PENDING";
        }
        String normalized = method.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "CASH", "QR" -> normalized;
            default -> "PENDING";
        };
    }

    private boolean isPaid(String method) {
        return "CASH".equalsIgnoreCase(method) || "QR".equalsIgnoreCase(method);
    }

    private void broadcastStatus(PaymentStatusDTO statusDTO) {
        messagingTemplate.convertAndSend("/topic/orders-payment", statusDTO);
    }

    private PaymentInitDTO tryInitPayosPayment(
            Long orderId,
            BigDecimal amount,
            String transferContent,
            LocalDateTime expiresAt,
            PaymentStatusDTO statusDTO
    ) {
        if (!isPayosConfigured()) {
            log.debug("PayOS is not configured. Skip PayOS init for order {}", orderId);
            return null;
        }

        Long amountInVnd = amount.setScale(0, RoundingMode.HALF_UP).longValue();
        if (amountInVnd <= 0) {
            throw new BadRequestException("Số tiền thanh toán không hợp lệ");
        }

        try {
            PayOS payOS = new PayOS(payosClientId.trim(), payosApiKey.trim(), payosChecksumKey.trim());
            CreatePaymentLinkRequest request = CreatePaymentLinkRequest.builder()
                    .orderCode(orderId)
                    .amount(amountInVnd)
                    .description(truncatePayosDescription(transferContent))
                    .returnUrl(payosReturnUrl)
                    .cancelUrl(payosCancelUrl)
                    .expiredAt(toEpochSecond(expiresAt))
                    .build();
            log.debug("Creating PayOS payment link for order {}, amount={}, returnUrl={}", orderId, amountInVnd, payosReturnUrl);

            CreatePaymentLinkResponse response = payOS.paymentRequests().create(request);
            String qrCode = response.getQrCode();
            String qrImageUrl = buildQrImageFromContent(qrCode);

            return buildInitResponse(
                    orderId,
                    amount,
                    transferContent,
                    qrImageUrl,
                    qrCode,
                    response.getCheckoutUrl(),
                    "PAYOS",
                    toLocalDateTime(response.getExpiredAt(), expiresAt),
                    statusDTO
            );
        } catch (Exception ex) {
            log.error("PayOS init failed for order {}: {}", orderId, ex.getMessage());
            throw new BadRequestException("Không thể tạo QR PayOS: " + ex.getMessage());
        }
    }

    private PaymentInitDTO buildInitResponse(
            Long orderId,
            BigDecimal amount,
            String transferContent,
            String qrImageUrl,
            String qrCode,
            String checkoutUrl,
            String provider,
            LocalDateTime expiresAt,
            PaymentStatusDTO statusDTO
    ) {
        return PaymentInitDTO.builder()
                .orderId(orderId)
                .amount(amount)
                .transferContent(transferContent)
                .qrImageUrl(qrImageUrl)
                .qrCode(qrCode)
                .checkoutUrl(checkoutUrl)
                .provider(provider)
                .expiresAt(expiresAt)
                .paymentStatus(statusDTO)
                .build();
    }

    private String buildVietQrImageUrl(BigDecimal amount, String transferContent) {
        return "https://img.vietqr.io/image/" + bankBin + "-" + bankAccount + "-compact2.png"
                + "?amount=" + urlEncode(amount.stripTrailingZeros().toPlainString())
                + "&addInfo=" + urlEncode(transferContent)
                + "&accountName=" + urlEncode(bankAccountName);
    }

    private String buildQrImageFromContent(String qrCodeContent) {
        if (qrCodeContent == null || qrCodeContent.isBlank()) {
            return null;
        }
        return "https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=" + urlEncode(qrCodeContent);
    }

    private boolean isPayosConfigured() {
        return payosClientId != null && !payosClientId.isBlank()
                && payosApiKey != null && !payosApiKey.isBlank()
                && payosChecksumKey != null && !payosChecksumKey.isBlank();
    }

    private String truncatePayosDescription(String value) {
        if (value == null || value.isBlank()) {
            return "SMARTDSS";
        }
        String normalized = value.trim();
        return normalized.length() > 25 ? normalized.substring(0, 25) : normalized;
    }

    private long toEpochSecond(LocalDateTime dateTime) {
        return dateTime.atZone(ZoneId.systemDefault()).toEpochSecond();
    }

    private LocalDateTime toLocalDateTime(Long epochSecond, LocalDateTime fallback) {
        if (epochSecond == null || epochSecond <= 0) {
            return fallback;
        }
        return LocalDateTime.ofInstant(Instant.ofEpochSecond(epochSecond), ZoneId.systemDefault());
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String normalizeProviderTransactionId(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
