package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.PaymentInitDTO;
import C2SE._1.Capstone2.dto.OrderDTO;
import C2SE._1.Capstone2.dto.PaymentStatusDTO;
import C2SE._1.Capstone2.dto.TableCashSettlementResultDTO;
import C2SE._1.Capstone2.dto.TableSettlementDetailDTO;
import C2SE._1.Capstone2.dto.TableQrInitDTO;
import C2SE._1.Capstone2.dto.TableSettlementSummaryDTO;
import C2SE._1.Capstone2.dto.PaymentWebhookDTO;
import C2SE._1.Capstone2.entity.Order;
import C2SE._1.Capstone2.entity.OrderStatus;
import C2SE._1.Capstone2.entity.SalesTransaction;
import C2SE._1.Capstone2.entity.TablePaymentSession;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.OrderMapper;
import C2SE._1.Capstone2.repository.OrderRepository;
import C2SE._1.Capstone2.repository.SalesTransactionRepository;
import C2SE._1.Capstone2.repository.TablePaymentSessionRepository;
import C2SE._1.Capstone2.service.FinanceService;
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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentServiceImpl implements PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentServiceImpl.class);
    private static final String TABLE_QR_MARKER_PREFIX = "TABLEQR:";

    private final OrderRepository orderRepository;
    private final SalesTransactionRepository salesTransactionRepository;
    private final TablePaymentSessionRepository tablePaymentSessionRepository;
    private final OrderMapper orderMapper;
    private final FinanceService financeService;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${app.payment.bank.bin:970422}")
    private String bankBin;
    @Value("${app.payment.bank.account:55777777686868}")
    private String bankAccount;
    @Value("${app.payment.bank.account-name:SMARTDSS CAFE}")
    private String bankAccountName;
    @Value("${app.payment.qr.expire-minutes:15}")
    private int qrExpireMinutes;
    @Value("${app.payment.webhook.secret:}")
    private String webhookSecret;
    @Value("${app.payment.webhook.allow-insecure:false}")
    private boolean allowInsecureWebhook;
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
    @Value("${app.timezone:Asia/Ho_Chi_Minh}")
    private String appTimezone;

    @Override
    public PaymentInitDTO initQrPayment(Long orderId) {
        log.info("Init payment requested for order {}", orderId);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));
        if (order.getStatus() != OrderStatus.COMPLETED) {
            log.warn("Reject init payment for order {} because status is {}", orderId, order.getStatus());
            throw new BadRequestException("Chỉ được thanh toán cho đơn đã COMPLETED");
        }

        SalesTransaction tx = getTransactionForUpdate(orderId);

        if (isPaid(tx.getPaymentMethod())) {
            log.warn("Reject init payment for order {} because payment is already {}", orderId, tx.getPaymentMethod());
            throw new BadRequestException("Đơn này đã được thanh toán");
        }

        if (!isPaid(tx.getPaymentMethod())) {
            tx.setPaymentMethod("PENDING");
            salesTransactionRepository.save(tx);
            log.debug("Marked order {} payment method as PENDING before QR init", orderId);
        }

        BigDecimal amount = tx.getTotalAmount() == null ? BigDecimal.ZERO : tx.getTotalAmount();
        String transferContent = "BILL-" + orderId;
        LocalDateTime expiresAt = now().plusMinutes(Math.max(1, qrExpireMinutes));
        PaymentStatusDTO statusDTO = toStatusDTO(tx);

        PaymentInitDTO payosInit = tryInitPayosPayment(orderId, amount, transferContent, expiresAt, tx, statusDTO);
        if (payosInit != null) {
            log.info("Init payment success with provider PAYOS for order {}", orderId);
            return payosInit;
        }

        String qrImageUrl = buildVietQrImageUrl(amount, transferContent);
        log.info("Init payment fallback to provider VIETQR for order {}", orderId);
        return buildInitResponse(orderId, amount, transferContent, qrImageUrl, null, null, "VIETQR", expiresAt, statusDTO);
    }

    @Override
    public TableQrInitDTO initTableQrPayment(String tableNumber) {
        String normalizedTableNumber = tableNumber == null ? "" : tableNumber.trim();
        if (normalizedTableNumber.isEmpty()) {
            throw new BadRequestException("Tên bàn không được để trống");
        }

        List<Order> completedTableOrders = orderRepository.findByTableNumberOrderByCreatedAtDesc(normalizedTableNumber)
                .stream()
                .filter(order -> order.getStatus() == OrderStatus.COMPLETED)
                .toList();

        if (completedTableOrders.isEmpty()) {
            throw new BadRequestException("Bàn này không có đơn COMPLETED để tạo QR thanh toán");
        }

        List<SalesTransaction> unpaidTransactions = new ArrayList<>();
        List<Long> includedOrderIds = new ArrayList<>();
        Set<String> staleSessionKeys = new HashSet<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (Order order : completedTableOrders) {
            SalesTransaction tx = getTransactionForUpdate(order.getId());
            if (isPaid(tx.getPaymentMethod())) {
                continue;
            }
            String currentSessionKey = normalizeTablePaymentSessionKey(tx.getTablePaymentSessionKey());
            if (currentSessionKey != null) {
                staleSessionKeys.add(currentSessionKey);
            }
            tx.setPaymentMethod("PENDING");
            tx.setPaidAt(null);
            tx.setProviderTransactionId(null);
            tx.setTablePaymentSessionKey(null);
            unpaidTransactions.add(tx);
            includedOrderIds.add(order.getId());
            totalAmount = totalAmount.add(tx.getTotalAmount() == null ? BigDecimal.ZERO : tx.getTotalAmount());
        }

        if (unpaidTransactions.isEmpty()) {
            throw new BadRequestException("Bàn này không còn đơn COMPLETED chưa thanh toán");
        }

        Long representativeOrderId = includedOrderIds.get(0);
        String sessionKey = buildTablePaymentSessionKey();
        LocalDateTime expiresAt = now().plusMinutes(Math.max(1, qrExpireMinutes));
        String transferContent = buildTableTransferContent(normalizedTableNumber, representativeOrderId);

        String provider = "VIETQR";
        Long providerOrderCode = null;
        String qrCode = null;
        String checkoutUrl = null;
        String qrImageUrl = buildVietQrImageUrl(totalAmount, transferContent);

        if (isPayosConfigured()) {
            long payosOrderCode = buildPayosOrderCode(representativeOrderId);
            providerOrderCode = payosOrderCode;
            PayosLinkResult payosLink = createPayosPaymentLink(totalAmount, transferContent, expiresAt, payosOrderCode);
            qrCode = payosLink.qrCode;
            checkoutUrl = payosLink.checkoutUrl;
            expiresAt = payosLink.expiresAt;
            provider = "PAYOS";
            qrImageUrl = buildQrImageFromContent(qrCode);

            for (SalesTransaction tx : unpaidTransactions) {
                tx.setProviderTransactionId(null);
                tx.setTablePaymentSessionKey(sessionKey);
                tx.setPayosQrCode(qrCode);
                tx.setPayosCheckoutUrl(checkoutUrl);
                tx.setPayosQrExpiresAt(expiresAt);
            }
        } else {
            for (SalesTransaction tx : unpaidTransactions) {
                tx.setProviderTransactionId(null);
                tx.setTablePaymentSessionKey(sessionKey);
                tx.setPayosQrCode(null);
                tx.setPayosCheckoutUrl(null);
                tx.setPayosQrExpiresAt(expiresAt);
            }
        }

        closeTablePaymentSessions(staleSessionKeys);
        salesTransactionRepository.saveAll(unpaidTransactions);

        tablePaymentSessionRepository.save(TablePaymentSession.builder()
                .sessionKey(sessionKey)
                .tableNumber(normalizedTableNumber)
                .representativeOrderId(representativeOrderId)
                .expectedAmount(totalAmount)
                .provider(provider)
                .providerOrderCode(providerOrderCode)
                .providerTransactionId(null)
                .status("PENDING")
                .transferContent(transferContent)
                .expiresAt(expiresAt)
                .paidAt(null)
                .includedOrderIds(serializeOrderIds(includedOrderIds))
                .build());

        return TableQrInitDTO.builder()
                .tableNumber(normalizedTableNumber)
                .representativeOrderId(representativeOrderId)
                .includedOrderIds(includedOrderIds)
                .amount(totalAmount)
                .transferContent(transferContent)
                .qrImageUrl(qrImageUrl)
                .qrCode(qrCode)
                .checkoutUrl(checkoutUrl)
                .provider(provider)
                .expiresAt(expiresAt)
                .build();
    }

    @Override
    public PaymentStatusDTO markCashPaid(Long orderId) {
        log.info("Mark cash paid requested for order {}", orderId);
        SalesTransaction tx = getTransactionForUpdate(orderId);
        String tablePaymentSessionKey = normalizeTablePaymentSessionKey(tx.getTablePaymentSessionKey());
        String currentMethod = normalizeMethod(tx.getPaymentMethod());
        if ("QR".equals(currentMethod)) {
            log.warn("Reject mark cash paid for order {} because already paid by QR", orderId);
            throw new BadRequestException("Đơn này đã thanh toán bằng QR");
        }
        if ("CASH".equals(currentMethod)) {
            log.info("Ignore duplicate mark cash paid for order {}", orderId);
            return toStatusDTO(tx);
        }
        tx.setPaymentMethod("CASH");
        tx.setPaidAt(now());
        tx.setTablePaymentSessionKey(null);
        SalesTransaction saved = salesTransactionRepository.save(tx);
        financeService.recordAutoIncomeFromPayment(
            saved.getOrder() == null ? null : saved.getOrder().getId(),
            saved.getTotalAmount(),
            saved.getPaidAt(),
            saved.getCashier()
        );
        closeTablePaymentSession(tablePaymentSessionKey);
        PaymentStatusDTO statusDTO = toStatusDTO(saved);
        broadcastStatus(statusDTO);
        log.info("Marked order {} as CASH paid", orderId);
        return statusDTO;
    }

    @Override
    public TableCashSettlementResultDTO markTableCashPaid(String tableNumber) {
        String normalizedTableNumber = tableNumber == null ? "" : tableNumber.trim();
        if (normalizedTableNumber.isEmpty()) {
            throw new BadRequestException("Tên bàn không được để trống");
        }

        List<Order> tableOrders = orderRepository.findByTableNumberOrderByCreatedAtDesc(normalizedTableNumber)
                .stream()
                .filter(order -> order.getStatus() == OrderStatus.COMPLETED)
                .toList();

        if (tableOrders.isEmpty()) {
            throw new BadRequestException("Bàn này không có đơn COMPLETED để thanh toán");
        }

        LocalDateTime paidAt = now();
        List<SalesTransaction> toUpdate = new ArrayList<>();
        List<Long> settledOrderIds = new ArrayList<>();
        Set<String> sessionKeysToClose = new HashSet<>();
        BigDecimal settledTotalAmount = BigDecimal.ZERO;

        for (Order order : tableOrders) {
            SalesTransaction tx = getTransactionForUpdate(order.getId());
            String currentMethod = normalizeMethod(tx.getPaymentMethod());

            // Skip orders already settled by other flows/concurrent cashiers.
            if (isPaid(currentMethod)) {
                continue;
            }

            String tablePaymentSessionKey = normalizeTablePaymentSessionKey(tx.getTablePaymentSessionKey());
            if (tablePaymentSessionKey != null) {
                sessionKeysToClose.add(tablePaymentSessionKey);
            }
            tx.setPaymentMethod("CASH");
            tx.setPaidAt(paidAt);
            tx.setTablePaymentSessionKey(null);
            toUpdate.add(tx);
            settledOrderIds.add(order.getId());
            settledTotalAmount = settledTotalAmount.add(tx.getTotalAmount() == null ? BigDecimal.ZERO : tx.getTotalAmount());
        }

        if (toUpdate.isEmpty()) {
            throw new BadRequestException("Bàn này không còn đơn COMPLETED chưa thanh toán");
        }

        salesTransactionRepository.saveAll(toUpdate);
        closeTablePaymentSessions(sessionKeysToClose);
        for (SalesTransaction tx : toUpdate) {
            financeService.recordAutoIncomeFromPayment(
                    tx.getOrder() == null ? null : tx.getOrder().getId(),
                    tx.getTotalAmount(),
                    tx.getPaidAt(),
                    tx.getCashier()
            );
            broadcastStatus(toStatusDTO(tx));
        }

        return TableCashSettlementResultDTO.builder()
                .tableNumber(normalizedTableNumber)
                .settledCount(settledOrderIds.size())
                .settledOrderIds(settledOrderIds)
                .settledTotalAmount(settledTotalAmount)
                .paidAt(paidAt)
                .build();
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
    @Transactional(readOnly = true)
    public List<TableSettlementSummaryDTO> getTableSettlementSummary() {
        List<Order> tableOrders = orderRepository.findTableOrdersForSettlement(OrderStatus.CANCELLED);
        if (tableOrders.isEmpty()) {
            return List.of();
        }

        List<Long> completedOrderIds = tableOrders.stream()
                .filter(order -> order.getStatus() == OrderStatus.COMPLETED)
                .map(Order::getId)
                .toList();

        Map<Long, Boolean> paidByOrderId = new HashMap<>();
        if (!completedOrderIds.isEmpty()) {
            List<SalesTransaction> txList = salesTransactionRepository.findByOrderIdIn(completedOrderIds);
            for (SalesTransaction tx : txList) {
                if (tx.getOrder() != null && tx.getOrder().getId() != null) {
                    paidByOrderId.put(tx.getOrder().getId(), isPaid(tx.getPaymentMethod()));
                }
            }
        }

        Map<String, TableSummaryAccumulator> grouped = new HashMap<>();
        for (Order order : tableOrders) {
            String tableNumber = order.getTableNumber() == null ? "" : order.getTableNumber().trim();
            if (tableNumber.isEmpty()) {
                continue;
            }

            TableSummaryAccumulator summary = grouped.computeIfAbsent(
                    tableNumber,
                    key -> new TableSummaryAccumulator(key, order.getCreatedAt())
            );
            summary.bumpLatest(order.getCreatedAt());

            if (order.getStatus() == OrderStatus.PENDING) {
                summary.pendingCount++;
                continue;
            }

            if (order.getStatus() == OrderStatus.PREPARING) {
                summary.preparingCount++;
                continue;
            }

            if (order.getStatus() == OrderStatus.COMPLETED) {
                boolean paid = Boolean.TRUE.equals(paidByOrderId.get(order.getId()));
                if (!paid) {
                    summary.completedUnpaidCount++;
                    summary.completedUnpaidOrderIds.add(order.getId());
                    summary.completedUnpaidTotal = summary.completedUnpaidTotal.add(
                            order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount()
                    );
                }
            }
        }

        return grouped.values().stream()
                .filter(TableSummaryAccumulator::hasAnyTrackedOrder)
                .sorted((left, right) -> {
                    LocalDateTime leftLatest = left.latestOrderAt;
                    LocalDateTime rightLatest = right.latestOrderAt;
                    if (leftLatest == null && rightLatest == null) {
                        return 0;
                    }
                    if (leftLatest == null) {
                        return 1;
                    }
                    if (rightLatest == null) {
                        return -1;
                    }
                    return rightLatest.compareTo(leftLatest);
                })
                .map(TableSummaryAccumulator::toDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TableSettlementDetailDTO getTableSettlementDetail(String tableNumber) {
        String normalizedTableNumber = tableNumber == null ? "" : tableNumber.trim();
        if (normalizedTableNumber.isEmpty()) {
            throw new BadRequestException("Tên bàn không được để trống");
        }

        List<Order> tableOrders = orderRepository.findByTableNumberOrderByCreatedAtDesc(normalizedTableNumber)
                .stream()
                .filter(order -> order.getStatus() != OrderStatus.CANCELLED)
                .toList();

        if (tableOrders.isEmpty()) {
            throw new BadRequestException("Bàn này không có đơn để hiển thị");
        }

        List<Long> orderIds = tableOrders.stream().map(Order::getId).toList();
        Map<Long, SalesTransaction> txByOrderId = new HashMap<>();
        List<SalesTransaction> txList = salesTransactionRepository.findByOrderIdIn(orderIds);
        for (SalesTransaction tx : txList) {
            if (tx.getOrder() != null && tx.getOrder().getId() != null) {
                txByOrderId.put(tx.getOrder().getId(), tx);
            }
        }

        TableSummaryAccumulator summary = new TableSummaryAccumulator(normalizedTableNumber, tableOrders.get(0).getCreatedAt());
        List<PaymentStatusDTO> paymentStatuses = new ArrayList<>();
        for (Order order : tableOrders) {
            summary.bumpLatest(order.getCreatedAt());

            SalesTransaction tx = txByOrderId.get(order.getId());
            PaymentStatusDTO paymentStatus = tx == null
                    ? PaymentStatusDTO.builder().orderId(order.getId()).status("PENDING").paymentMethod("PENDING").build()
                    : toStatusDTO(tx);
            paymentStatuses.add(paymentStatus);

            if (order.getStatus() == OrderStatus.PENDING) {
                summary.pendingCount++;
                continue;
            }
            if (order.getStatus() == OrderStatus.PREPARING) {
                summary.preparingCount++;
                continue;
            }
            if (order.getStatus() == OrderStatus.COMPLETED && "PAID".equals(paymentStatus.getStatus())) {
                continue;
            }
            if (order.getStatus() == OrderStatus.COMPLETED) {
                summary.completedUnpaidCount++;
                summary.completedUnpaidOrderIds.add(order.getId());
                summary.completedUnpaidTotal = summary.completedUnpaidTotal.add(
                        order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount()
                );
            }
        }

        List<OrderDTO> orderDTOs = orderMapper.toDTOList(tableOrders);
        return TableSettlementDetailDTO.builder()
                .tableNumber(summary.tableNumber)
                .pendingCount(summary.pendingCount)
                .preparingCount(summary.preparingCount)
                .completedUnpaidCount(summary.completedUnpaidCount)
                .completedUnpaidTotal(summary.completedUnpaidTotal)
                .completedUnpaidOrderIds(summary.completedUnpaidOrderIds)
                .latestOrderAt(summary.latestOrderAt)
                .orders(orderDTOs)
                .paymentStatuses(paymentStatuses)
                .build();
    }

    @Override
    public PaymentStatusDTO handleWebhook(PaymentWebhookDTO webhookDTO, String webhookSecretHeader) {
        log.debug("Handle generic webhook for orderId={}, status={}, hasAmount={}",
                webhookDTO.getOrderId(), webhookDTO.getStatus(), webhookDTO.getAmount() != null);
        if (webhookSecret == null || webhookSecret.isBlank()) {
            if (!allowInsecureWebhook) {
                log.warn("Reject generic webhook because secret is not configured");
                incrementWebhookMetric("rejected", "secret_missing");
                throw new BadRequestException("Webhook secret chưa được cấu hình");
            }
            log.warn("Allowing insecure generic webhook because app.payment.webhook.allow-insecure=true");
        } else if (webhookSecretHeader == null || !webhookSecret.equals(webhookSecretHeader)) {
            log.warn("Reject generic webhook due to invalid secret for orderId={}", webhookDTO.getOrderId());
            incrementWebhookMetric("rejected", "secret_invalid");
            throw new BadRequestException("Webhook secret không hợp lệ");
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
        SalesTransaction tx = salesTransactionRepository.findByOrderIdForUpdate(webhookDTO.getOrderId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy giao dịch theo orderId"));

        if (!"PAID".equals(status)) {
            log.info("Ignore webhook update because status is not PAID for orderId={}", webhookDTO.getOrderId());
            return toStatusDTO(tx);
        }

        String tablePaymentSessionKey = normalizeTablePaymentSessionKey(tx.getTablePaymentSessionKey());
        if (tablePaymentSessionKey != null) {
            return applyTablePaymentSessionWebhook(tx, tablePaymentSessionKey, webhookDTO, providerTxId);
        }

        String tableQrMarker = normalizeProviderTransactionId(tx.getProviderTransactionId());
        if (isTableQrMarker(tableQrMarker)) {
            return applyTableQrWebhook(tx, tableQrMarker, webhookDTO, providerTxId);
        }

        BigDecimal expectedAmount = tx.getTotalAmount() == null ? BigDecimal.ZERO : tx.getTotalAmount();
        BigDecimal expectedAmountForProvider = expectedAmount.setScale(0, RoundingMode.HALF_UP);
        if (webhookDTO.getAmount() == null) {
            log.warn("Reject webhook because amount is missing for orderId={}", webhookDTO.getOrderId());
            incrementWebhookMetric("rejected", "amount_missing");
            throw new BadRequestException("Thiếu số tiền thanh toán trong webhook");
        }
        BigDecimal actualAmountForProvider = webhookDTO.getAmount().setScale(0, RoundingMode.HALF_UP);
        if (actualAmountForProvider.compareTo(expectedAmountForProvider) != 0) {
            log.warn("Reject webhook amount mismatch for orderId={}, expectedProviderAmount={}, expectedRawAmount={}, actualProviderAmount={}",
                    webhookDTO.getOrderId(), expectedAmountForProvider, expectedAmount, actualAmountForProvider);
            incrementWebhookMetric("rejected", "amount_mismatch");
            throw new BadRequestException("Số tiền thanh toán không khớp hóa đơn");
        }

        // Idempotency: provider may retry the exact same PAID event many times.
        if (isPaid(tx.getPaymentMethod())) {
            String existingProviderTxId = normalizeProviderTransactionId(tx.getProviderTransactionId());
            if ("CASH".equalsIgnoreCase(tx.getPaymentMethod())) {
                log.info("Ignore webhook for orderId={} because order already paid by CASH", webhookDTO.getOrderId());
                incrementWebhookMetric("duplicate", "already_cash_paid");
                return toStatusDTO(tx);
            }
            if (providerTxId == null || existingProviderTxId == null || providerTxId.equals(existingProviderTxId)) {
                log.info("Ignore duplicate PAID webhook for orderId={}, providerTransactionId={}",
                        webhookDTO.getOrderId(), providerTxId);
                incrementWebhookMetric("duplicate", "provider_retry");
                return toStatusDTO(tx);
            }
            log.warn("Reject conflicting provider transaction for orderId={}, existingProviderTransactionId={}, incomingProviderTransactionId={}",
                    webhookDTO.getOrderId(), existingProviderTxId, providerTxId);
            incrementWebhookMetric("rejected", "provider_tx_conflict");
            throw new BadRequestException("Webhook bị trùng với providerTransactionId khác");
        }

        tx.setPaymentMethod("QR");
        tx.setProviderTransactionId(providerTxId);
        tx.setPaidAt(now());
        SalesTransaction saved = salesTransactionRepository.save(tx);
        financeService.recordAutoIncomeFromPayment(
            saved.getOrder() == null ? null : saved.getOrder().getId(),
            saved.getTotalAmount(),
            saved.getPaidAt(),
            saved.getCashier()
        );
        PaymentStatusDTO statusDTO = toStatusDTO(saved);
        broadcastStatus(statusDTO);
        log.info("Order {} marked as QR paid from webhook, providerTransactionId={}", webhookDTO.getOrderId(), providerTxId);
        return statusDTO;
    }

    private PaymentStatusDTO applyTablePaymentSessionWebhook(
            SalesTransaction anchorTx,
            String sessionKey,
            PaymentWebhookDTO webhookDTO,
            String incomingProviderTransactionId
    ) {
        TablePaymentSession session = tablePaymentSessionRepository.findBySessionKeyForUpdate(sessionKey)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy phiên thanh toán QR gộp"));

        List<SalesTransaction> groupedTransactions = salesTransactionRepository.findByTablePaymentSessionKeyForUpdate(sessionKey);
        if (groupedTransactions.isEmpty()) {
            throw new BadRequestException("Không tìm thấy giao dịch trong phiên QR gộp");
        }

        for (SalesTransaction tx : groupedTransactions) {
            if ("CASH".equalsIgnoreCase(tx.getPaymentMethod())) {
                throw new BadRequestException("Có đơn trong bàn đã thu tiền mặt, không thể chốt QR gộp");
            }
        }

        BigDecimal expectedAmount = session.getExpectedAmount() == null ? BigDecimal.ZERO : session.getExpectedAmount();
        if (expectedAmount.compareTo(BigDecimal.ZERO) == 0) {
            for (SalesTransaction tx : groupedTransactions) {
                expectedAmount = expectedAmount.add(tx.getTotalAmount() == null ? BigDecimal.ZERO : tx.getTotalAmount());
            }
        }

        if (webhookDTO.getAmount() == null) {
            incrementWebhookMetric("rejected", "amount_missing");
            throw new BadRequestException("Thiếu số tiền thanh toán trong webhook");
        }

        BigDecimal expectedAmountForProvider = expectedAmount.setScale(0, RoundingMode.HALF_UP);
        BigDecimal actualAmountForProvider = webhookDTO.getAmount().setScale(0, RoundingMode.HALF_UP);
        if (actualAmountForProvider.compareTo(expectedAmountForProvider) != 0) {
            log.warn("Reject grouped webhook amount mismatch for orderId={}, table={}, expectedProviderAmount={}, actualProviderAmount={}",
                    webhookDTO.getOrderId(), session.getTableNumber(), expectedAmountForProvider, actualAmountForProvider);
            incrementWebhookMetric("rejected", "amount_mismatch");
            throw new BadRequestException("Số tiền thanh toán không khớp tổng đơn của bàn");
        }

        List<SalesTransaction> toSettle = groupedTransactions.stream()
                .filter(tx -> !isPaid(tx.getPaymentMethod()))
                .collect(Collectors.toList());

        if (toSettle.isEmpty()) {
            String existingProviderTxId = normalizeProviderTransactionId(session.getProviderTransactionId());
            if (incomingProviderTransactionId == null || existingProviderTxId == null || incomingProviderTransactionId.equals(existingProviderTxId)) {
                log.info("Ignore duplicate grouped PAID webhook for sessionKey={}, table={}, providerTransactionId={}",
                        sessionKey, session.getTableNumber(), incomingProviderTransactionId);
                incrementWebhookMetric("duplicate", "provider_retry");
                return toStatusDTO(anchorTx);
            }
            incrementWebhookMetric("rejected", "provider_tx_conflict");
            throw new BadRequestException("Webhook bị trùng với providerTransactionId khác");
        }

        LocalDateTime paidAt = now();
        for (SalesTransaction tx : toSettle) {
            tx.setPaymentMethod("QR");
            tx.setProviderTransactionId(incomingProviderTransactionId);
            tx.setPaidAt(paidAt);
            tx.setTablePaymentSessionKey(null);
        }

        salesTransactionRepository.saveAll(toSettle);
        session.setStatus("PAID");
        session.setPaidAt(paidAt);
        session.setProviderTransactionId(incomingProviderTransactionId);
        tablePaymentSessionRepository.save(session);

        PaymentStatusDTO anchorStatus = null;
        for (SalesTransaction tx : toSettle) {
            financeService.recordAutoIncomeFromPayment(
                    tx.getOrder() == null ? null : tx.getOrder().getId(),
                    tx.getTotalAmount(),
                    tx.getPaidAt(),
                    tx.getCashier()
            );
            PaymentStatusDTO statusDTO = toStatusDTO(tx);
            if (anchorTx.getOrder() != null && tx.getOrder() != null && anchorTx.getOrder().getId().equals(tx.getOrder().getId())) {
                anchorStatus = statusDTO;
            }
            broadcastStatus(statusDTO);
        }

        if (anchorStatus == null) {
            anchorStatus = PaymentStatusDTO.builder()
                    .orderId(webhookDTO.getOrderId())
                    .status("PAID")
                    .paymentMethod("QR")
                    .build();
        }

        log.info("Grouped table webhook settled sessionKey={}, table={}, settledCount={}, providerTransactionId={}",
                sessionKey, session.getTableNumber(), toSettle.size(), incomingProviderTransactionId);
        return anchorStatus;
    }

    private PaymentStatusDTO applyTableQrWebhook(
            SalesTransaction anchorTx,
            String tableQrMarker,
            PaymentWebhookDTO webhookDTO,
            String incomingProviderTransactionId
    ) {
        String tableNumber = "";
        if (anchorTx.getOrder() != null && anchorTx.getOrder().getTableNumber() != null) {
            tableNumber = anchorTx.getOrder().getTableNumber().trim();
        }
        if (tableNumber.isEmpty()) {
            throw new BadRequestException("Webhook bàn không hợp lệ: thiếu tableNumber");
        }

        List<Order> completedTableOrders = orderRepository.findByTableNumberOrderByCreatedAtDesc(tableNumber)
                .stream()
                .filter(order -> order.getStatus() == OrderStatus.COMPLETED)
                .toList();

        List<SalesTransaction> groupedTransactions = new ArrayList<>();
        for (Order order : completedTableOrders) {
            SalesTransaction tx = getTransactionForUpdate(order.getId());
            if (tableQrMarker.equals(normalizeProviderTransactionId(tx.getProviderTransactionId()))) {
                groupedTransactions.add(tx);
            }
        }

        if (groupedTransactions.isEmpty()) {
            throw new BadRequestException("Không tìm thấy nhóm giao dịch theo QR bàn");
        }

        for (SalesTransaction tx : groupedTransactions) {
            if ("CASH".equalsIgnoreCase(tx.getPaymentMethod())) {
                throw new BadRequestException("Có đơn trong bàn đã thu tiền mặt, không thể chốt QR gộp");
            }
        }

        BigDecimal expectedAmount = BigDecimal.ZERO;
        List<SalesTransaction> toSettle = new ArrayList<>();
        for (SalesTransaction tx : groupedTransactions) {
            expectedAmount = expectedAmount.add(tx.getTotalAmount() == null ? BigDecimal.ZERO : tx.getTotalAmount());
            if (!isPaid(tx.getPaymentMethod())) {
                toSettle.add(tx);
            }
        }

        if (webhookDTO.getAmount() == null) {
            incrementWebhookMetric("rejected", "amount_missing");
            throw new BadRequestException("Thiếu số tiền thanh toán trong webhook");
        }

        BigDecimal expectedAmountForProvider = expectedAmount.setScale(0, RoundingMode.HALF_UP);
        BigDecimal actualAmountForProvider = webhookDTO.getAmount().setScale(0, RoundingMode.HALF_UP);
        if (actualAmountForProvider.compareTo(expectedAmountForProvider) != 0) {
            log.warn("Reject grouped webhook amount mismatch for orderId={}, table={}, expectedProviderAmount={}, actualProviderAmount={}",
                    webhookDTO.getOrderId(), tableNumber, expectedAmountForProvider, actualAmountForProvider);
            incrementWebhookMetric("rejected", "amount_mismatch");
            throw new BadRequestException("Số tiền thanh toán không khớp tổng đơn của bàn");
        }

        if (toSettle.isEmpty()) {
            String existingProviderTxId = normalizeProviderTransactionId(anchorTx.getProviderTransactionId());
            if (incomingProviderTransactionId == null || existingProviderTxId == null || incomingProviderTransactionId.equals(existingProviderTxId)) {
                log.info("Ignore duplicate grouped PAID webhook for table={}, orderId={}, providerTransactionId={}",
                        tableNumber, webhookDTO.getOrderId(), incomingProviderTransactionId);
                incrementWebhookMetric("duplicate", "provider_retry");
                return toStatusDTO(anchorTx);
            }
            incrementWebhookMetric("rejected", "provider_tx_conflict");
            throw new BadRequestException("Webhook bị trùng với providerTransactionId khác");
        }

        LocalDateTime paidAt = now();
        for (SalesTransaction tx : toSettle) {
            tx.setPaymentMethod("QR");
            tx.setProviderTransactionId(incomingProviderTransactionId);
            tx.setPaidAt(paidAt);
        }

        salesTransactionRepository.saveAll(toSettle);
        PaymentStatusDTO anchorStatus = null;
        for (SalesTransaction tx : toSettle) {
            financeService.recordAutoIncomeFromPayment(
                    tx.getOrder() == null ? null : tx.getOrder().getId(),
                    tx.getTotalAmount(),
                    tx.getPaidAt(),
                    tx.getCashier()
            );
            PaymentStatusDTO statusDTO = toStatusDTO(tx);
            if (anchorTx.getOrder() != null && tx.getOrder() != null && anchorTx.getOrder().getId().equals(tx.getOrder().getId())) {
                anchorStatus = statusDTO;
            }
            broadcastStatus(statusDTO);
        }

        if (anchorStatus == null) {
            anchorStatus = PaymentStatusDTO.builder()
                    .orderId(webhookDTO.getOrderId())
                    .status("PAID")
                    .paymentMethod("QR")
                    .build();
        }

        log.info("Grouped table webhook settled table={}, settledCount={}, providerTransactionId={}",
                tableNumber, toSettle.size(), incomingProviderTransactionId);
        return anchorStatus;
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
            SalesTransaction tx,
            PaymentStatusDTO statusDTO
    ) {
        if (!isPayosConfigured()) {
            log.debug("PayOS is not configured. Skip PayOS init for order {}", orderId);
            return null;
        }
        if (hasReusablePayosLink(tx)) {
            log.info("Reuse cached PayOS link for order {}", orderId);
            return buildInitResponse(
                    orderId,
                    amount,
                    transferContent,
                    buildQrImageFromContent(tx.getPayosQrCode()),
                    tx.getPayosQrCode(),
                    tx.getPayosCheckoutUrl(),
                    "PAYOS",
                    tx.getPayosQrExpiresAt() == null ? expiresAt : tx.getPayosQrExpiresAt(),
                    statusDTO
            );
        }

        Long amountInVnd = amount.setScale(0, RoundingMode.HALF_UP).longValue();
        if (amountInVnd <= 0) {
            throw new BadRequestException("Số tiền thanh toán không hợp lệ");
        }

        try {
            PayOS payOS = new PayOS(payosClientId.trim(), payosApiKey.trim(), payosChecksumKey.trim());
            long payosOrderCode = buildPayosOrderCode(orderId);
            CreatePaymentLinkRequest request = CreatePaymentLinkRequest.builder()
                    .orderCode(payosOrderCode)
                    .amount(amountInVnd)
                    .description(truncatePayosDescription(transferContent))
                    .returnUrl(payosReturnUrl)
                    .cancelUrl(payosCancelUrl)
                    .expiredAt(toEpochSecond(expiresAt))
                    .build();
            log.debug("Creating PayOS payment link for order {}, payosOrderCode={}, amount={}, returnUrl={}",
                    orderId, payosOrderCode, amountInVnd, payosReturnUrl);

            CreatePaymentLinkResponse response = payOS.paymentRequests().create(request);
            String qrCode = response.getQrCode();
            String qrImageUrl = buildQrImageFromContent(qrCode);
            LocalDateTime resolvedExpiresAt = toLocalDateTime(response.getExpiredAt(), expiresAt);

            tx.setPayosQrCode(qrCode);
            tx.setPayosCheckoutUrl(response.getCheckoutUrl());
            tx.setPayosQrExpiresAt(resolvedExpiresAt);
            salesTransactionRepository.save(tx);

            return buildInitResponse(
                    orderId,
                    amount,
                    transferContent,
                    qrImageUrl,
                    qrCode,
                    response.getCheckoutUrl(),
                    "PAYOS",
                    resolvedExpiresAt,
                    statusDTO
            );
        } catch (Exception ex) {
            if (isOrderAlreadyExistsError(ex) && hasReusablePayosLink(tx)) {
                log.warn("PayOS says order exists, fallback to cached link for order {}", orderId);
                return buildInitResponse(
                        orderId,
                        amount,
                        transferContent,
                        buildQrImageFromContent(tx.getPayosQrCode()),
                        tx.getPayosQrCode(),
                        tx.getPayosCheckoutUrl(),
                        "PAYOS",
                        tx.getPayosQrExpiresAt() == null ? expiresAt : tx.getPayosQrExpiresAt(),
                        statusDTO
                );
            }
            log.error("PayOS init failed for order {}: {}", orderId, ex.getMessage());
            throw new BadRequestException("Không thể tạo QR PayOS: " + ex.getMessage());
        }
    }

    private PayosLinkResult createPayosPaymentLink(
            BigDecimal amount,
            String transferContent,
            LocalDateTime expiresAt,
            long payosOrderCode
    ) {
        Long amountInVnd = amount.setScale(0, RoundingMode.HALF_UP).longValue();
        if (amountInVnd <= 0) {
            throw new BadRequestException("Số tiền thanh toán không hợp lệ");
        }

        try {
            PayOS payOS = new PayOS(payosClientId.trim(), payosApiKey.trim(), payosChecksumKey.trim());
            CreatePaymentLinkRequest request = CreatePaymentLinkRequest.builder()
                    .orderCode(payosOrderCode)
                    .amount(amountInVnd)
                    .description(truncatePayosDescription(transferContent))
                    .returnUrl(payosReturnUrl)
                    .cancelUrl(payosCancelUrl)
                    .expiredAt(toEpochSecond(expiresAt))
                    .build();

            CreatePaymentLinkResponse response = payOS.paymentRequests().create(request);
            return new PayosLinkResult(
                    response.getQrCode(),
                    response.getCheckoutUrl(),
                    toLocalDateTime(response.getExpiredAt(), expiresAt)
            );
        } catch (Exception ex) {
            log.error("PayOS init failed for grouped table payment: {}", ex.getMessage());
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
        return dateTime.atZone(resolveZoneId()).toEpochSecond();
    }

    private LocalDateTime toLocalDateTime(Long epochSecond, LocalDateTime fallback) {
        if (epochSecond == null || epochSecond <= 0) {
            return fallback;
        }
        return LocalDateTime.ofInstant(Instant.ofEpochSecond(epochSecond), resolveZoneId());
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

    private String normalizeTablePaymentSessionKey(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String buildTablePaymentSessionKey() {
        return "TPS-" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT);
    }

    private String serializeOrderIds(List<Long> orderIds) {
        if (orderIds == null || orderIds.isEmpty()) {
            return "";
        }
        return orderIds.stream().map(String::valueOf).collect(Collectors.joining(","));
    }

    private void closeTablePaymentSessions(Set<String> sessionKeys) {
        if (sessionKeys == null || sessionKeys.isEmpty()) {
            return;
        }
        for (String sessionKey : sessionKeys) {
            closeTablePaymentSession(sessionKey);
        }
    }

    private void closeTablePaymentSession(String sessionKey) {
        String normalizedSessionKey = normalizeTablePaymentSessionKey(sessionKey);
        if (normalizedSessionKey == null) {
            return;
        }
        tablePaymentSessionRepository.findBySessionKeyForUpdate(normalizedSessionKey).ifPresent(session -> {
            if (!"PAID".equalsIgnoreCase(session.getStatus()) && !"CANCELLED".equalsIgnoreCase(session.getStatus())) {
                session.setStatus("CANCELLED");
                tablePaymentSessionRepository.save(session);
            }
        });
    }

    private String buildTableTransferContent(String tableNumber, Long representativeOrderId) {
        String compactTable = tableNumber.replaceAll("\\s+", "");
        if (compactTable.length() > 12) {
            compactTable = compactTable.substring(0, 12);
        }
        return "TABLE-" + compactTable + "-" + representativeOrderId;
    }

    private String buildTableQrMarker(long payosOrderCode) {
        return TABLE_QR_MARKER_PREFIX + payosOrderCode;
    }

    private boolean isTableQrMarker(String providerTransactionId) {
        return providerTransactionId != null && providerTransactionId.startsWith(TABLE_QR_MARKER_PREFIX);
    }

    private boolean hasReusablePayosLink(SalesTransaction tx) {
        if (tx == null || tx.getPayosQrCode() == null || tx.getPayosQrCode().isBlank() || tx.getPayosCheckoutUrl() == null || tx.getPayosCheckoutUrl().isBlank()) {
            return false;
        }
        if (tx.getPayosQrExpiresAt() == null) {
            return true;
        }
        return tx.getPayosQrExpiresAt().isAfter(now().minusMinutes(1));
    }

    private boolean isOrderAlreadyExistsError(Exception ex) {
        if (ex == null || ex.getMessage() == null) {
            return false;
        }
        String msg = ex.getMessage().toLowerCase(Locale.ROOT);
        return msg.contains("đơn thanh toán đã tồn tại")
                || msg.contains("don thanh toan da ton tai")
                || msg.contains("order already exists");
    }

    private long buildPayosOrderCode(Long orderId) {
        long safeOrderId = orderId == null ? 0L : Math.abs(orderId);
        long suffix = System.currentTimeMillis() % 1_000_000L;
        return safeOrderId * 1_000_000L + suffix;
    }

    private SalesTransaction getTransactionForUpdate(Long orderId) {
        return salesTransactionRepository.findByOrderIdForUpdate(orderId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy giao dịch bán hàng của đơn này"));
    }

    private LocalDateTime now() {
        return LocalDateTime.now(resolveZoneId());
    }

    private ZoneId resolveZoneId() {
        try {
            return ZoneId.of(appTimezone);
        } catch (Exception ex) {
            return ZoneId.of("Asia/Ho_Chi_Minh");
        }
    }

    private static final class TableSummaryAccumulator {
        private final String tableNumber;
        private int pendingCount;
        private int preparingCount;
        private int completedUnpaidCount;
        private BigDecimal completedUnpaidTotal = BigDecimal.ZERO;
        private final List<Long> completedUnpaidOrderIds = new ArrayList<>();
        private LocalDateTime latestOrderAt;

        private TableSummaryAccumulator(String tableNumber, LocalDateTime latestOrderAt) {
            this.tableNumber = tableNumber;
            this.latestOrderAt = latestOrderAt;
        }

        private void bumpLatest(LocalDateTime candidate) {
            if (candidate == null) {
                return;
            }
            if (latestOrderAt == null || candidate.isAfter(latestOrderAt)) {
                latestOrderAt = candidate;
            }
        }

        private boolean hasAnyTrackedOrder() {
            return pendingCount > 0 || preparingCount > 0 || completedUnpaidCount > 0;
        }

        private TableSettlementSummaryDTO toDTO() {
            return TableSettlementSummaryDTO.builder()
                    .tableNumber(tableNumber)
                    .pendingCount(pendingCount)
                    .preparingCount(preparingCount)
                    .completedUnpaidCount(completedUnpaidCount)
                    .completedUnpaidTotal(completedUnpaidTotal)
                    .completedUnpaidOrderIds(completedUnpaidOrderIds)
                    .latestOrderAt(latestOrderAt)
                    .build();
        }
    }

    private static final class PayosLinkResult {
        private final String qrCode;
        private final String checkoutUrl;
        private final LocalDateTime expiresAt;

        private PayosLinkResult(String qrCode, String checkoutUrl, LocalDateTime expiresAt) {
            this.qrCode = qrCode;
            this.checkoutUrl = checkoutUrl;
            this.expiresAt = expiresAt;
        }
    }

    private void incrementWebhookMetric(String outcome, String reason) {
        log.debug("Webhook metric event outcome={}, reason={}", outcome, reason);
    }
}
