package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.PaymentStatusDTO;
import C2SE._1.Capstone2.dto.PaymentWebhookDTO;
import C2SE._1.Capstone2.entity.Order;
import C2SE._1.Capstone2.entity.OrderStatus;
import C2SE._1.Capstone2.entity.SalesTransaction;
import C2SE._1.Capstone2.entity.TablePaymentSession;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.mapper.OrderMapper;
import C2SE._1.Capstone2.repository.OrderRepository;
import C2SE._1.Capstone2.repository.SalesTransactionRepository;
import C2SE._1.Capstone2.repository.TablePaymentSessionRepository;
import C2SE._1.Capstone2.service.FinanceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private SalesTransactionRepository salesTransactionRepository;
    @Mock
    private TablePaymentSessionRepository tablePaymentSessionRepository;
    @Mock
    private OrderMapper orderMapper;
    @Mock
    private FinanceService financeService;
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    @BeforeEach
    void setUp() {
        setField(paymentService, "appTimezone", "Asia/Ho_Chi_Minh");
    }

    @Test
    @DisplayName("Race guard: webhook PAID bị ignore khi đơn đã CASH")
    void handleProviderWebhook_ignoreWhenAlreadyCashPaid() {
        Order order = testOrder(101L, BigDecimal.valueOf(120000));
        SalesTransaction tx = pendingTx(order, BigDecimal.valueOf(120000));
        tx.setPaymentMethod("CASH");

        when(salesTransactionRepository.findByOrderIdForUpdate(101L)).thenReturn(Optional.of(tx));

        PaymentWebhookDTO webhook = PaymentWebhookDTO.builder()
                .orderId(101L)
                .status("PAID")
                .amount(BigDecimal.valueOf(120000))
                .providerTransactionId("tx-001")
                .build();

        PaymentStatusDTO result = paymentService.handleProviderWebhook(webhook);

        assertThat(result.getStatus()).isEqualTo("PAID");
        assertThat(result.getPaymentMethod()).isEqualTo("CASH");
        verify(salesTransactionRepository, never()).save(any(SalesTransaction.class));
    }

    @Test
    @DisplayName("Race guard: không cho chuyển CASH nếu đã QR")
    void markCashPaid_rejectWhenAlreadyQrPaid() {
        Order order = testOrder(102L, BigDecimal.valueOf(90000));
        SalesTransaction tx = pendingTx(order, BigDecimal.valueOf(90000));
        tx.setPaymentMethod("QR");

        when(salesTransactionRepository.findByOrderIdForUpdate(102L)).thenReturn(Optional.of(tx));

        assertThatThrownBy(() -> paymentService.markCashPaid(102L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đã thanh toán bằng QR");

        verify(salesTransactionRepository, never()).save(any(SalesTransaction.class));
    }

    @Test
    @DisplayName("Webhook PAID thiếu amount phải bị reject")
    void handleProviderWebhook_rejectWhenAmountMissing() {
        Order order = testOrder(103L, BigDecimal.valueOf(70000));
        SalesTransaction tx = pendingTx(order, BigDecimal.valueOf(70000));

        when(salesTransactionRepository.findByOrderIdForUpdate(103L)).thenReturn(Optional.of(tx));

        PaymentWebhookDTO webhook = PaymentWebhookDTO.builder()
                .orderId(103L)
                .status("PAID")
                .providerTransactionId("tx-002")
                .build();

        assertThatThrownBy(() -> paymentService.handleProviderWebhook(webhook))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Thiếu số tiền");
    }

            @Test
            @DisplayName("Grouped QR session: webhook PAID settle toàn bộ đơn trong session")
            void handleProviderWebhook_groupedSessionSettlesAllPendingOrders() {
            Order orderA = testOrder(201L, BigDecimal.valueOf(100000));
            Order orderB = testOrder(202L, BigDecimal.valueOf(50000));

            SalesTransaction txA = pendingTx(orderA, BigDecimal.valueOf(100000));
            txA.setTablePaymentSessionKey("TPS-SESSION-1");
            SalesTransaction txB = pendingTx(orderB, BigDecimal.valueOf(50000));
            txB.setTablePaymentSessionKey("TPS-SESSION-1");

            TablePaymentSession session = TablePaymentSession.builder()
                .sessionKey("TPS-SESSION-1")
                .tableNumber("Bàn 1")
                .representativeOrderId(201L)
                .expectedAmount(BigDecimal.valueOf(150000))
                .provider("PAYOS")
                .status("PENDING")
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .includedOrderIds("201,202")
                .build();

            when(salesTransactionRepository.findByOrderIdForUpdate(201L)).thenReturn(Optional.of(txA));
            when(tablePaymentSessionRepository.findBySessionKeyForUpdate("TPS-SESSION-1")).thenReturn(Optional.of(session));
            when(salesTransactionRepository.findByTablePaymentSessionKeyForUpdate("TPS-SESSION-1")).thenReturn(List.of(txA, txB));
            when(salesTransactionRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
            when(tablePaymentSessionRepository.save(any(TablePaymentSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PaymentWebhookDTO webhook = PaymentWebhookDTO.builder()
                .orderId(201L)
                .status("PAID")
                .amount(BigDecimal.valueOf(150000))
                .providerTransactionId("payos-tx-201")
                .build();

            PaymentStatusDTO result = paymentService.handleProviderWebhook(webhook);

            assertThat(result.getStatus()).isEqualTo("PAID");
            assertThat(result.getPaymentMethod()).isEqualTo("QR");
            assertThat(txA.getPaymentMethod()).isEqualTo("QR");
            assertThat(txB.getPaymentMethod()).isEqualTo("QR");
            assertThat(txA.getTablePaymentSessionKey()).isNull();
            assertThat(txB.getTablePaymentSessionKey()).isNull();
            assertThat(session.getStatus()).isEqualTo("PAID");
            assertThat(session.getProviderTransactionId()).isEqualTo("payos-tx-201");

            verify(salesTransactionRepository).saveAll(any());
            verify(tablePaymentSessionRepository).save(any(TablePaymentSession.class));
            verify(messagingTemplate, times(2)).convertAndSend(eq("/topic/orders-payment"), any(PaymentStatusDTO.class));
            }

            @Test
            @DisplayName("Grouped QR session: reject khi amount mismatch")
            void handleProviderWebhook_groupedSessionRejectAmountMismatch() {
            Order order = testOrder(203L, BigDecimal.valueOf(100000));
            SalesTransaction tx = pendingTx(order, BigDecimal.valueOf(100000));
            tx.setTablePaymentSessionKey("TPS-SESSION-2");

            TablePaymentSession session = TablePaymentSession.builder()
                .sessionKey("TPS-SESSION-2")
                .tableNumber("Bàn 2")
                .representativeOrderId(203L)
                .expectedAmount(BigDecimal.valueOf(100000))
                .provider("PAYOS")
                .status("PENDING")
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .includedOrderIds("203")
                .build();

            when(salesTransactionRepository.findByOrderIdForUpdate(203L)).thenReturn(Optional.of(tx));
            when(tablePaymentSessionRepository.findBySessionKeyForUpdate("TPS-SESSION-2")).thenReturn(Optional.of(session));
            when(salesTransactionRepository.findByTablePaymentSessionKeyForUpdate("TPS-SESSION-2")).thenReturn(List.of(tx));

            PaymentWebhookDTO webhook = PaymentWebhookDTO.builder()
                .orderId(203L)
                .status("PAID")
                .amount(BigDecimal.valueOf(90000))
                .providerTransactionId("payos-tx-203")
                .build();

            assertThatThrownBy(() -> paymentService.handleProviderWebhook(webhook))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không khớp tổng đơn của bàn");

            verify(salesTransactionRepository, never()).saveAll(any());
            verify(tablePaymentSessionRepository, never()).save(any(TablePaymentSession.class));
            }

            @Test
            @DisplayName("markCashPaid: đóng session QR gộp đang mở")
            void markCashPaid_closeOpenGroupedSession() {
            Order order = testOrder(204L, BigDecimal.valueOf(120000));
            SalesTransaction tx = pendingTx(order, BigDecimal.valueOf(120000));
            tx.setTablePaymentSessionKey("TPS-SESSION-3");

            TablePaymentSession session = TablePaymentSession.builder()
                .sessionKey("TPS-SESSION-3")
                .tableNumber("Bàn 3")
                .representativeOrderId(204L)
                .expectedAmount(BigDecimal.valueOf(120000))
                .provider("PAYOS")
                .status("PENDING")
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .includedOrderIds("204")
                .build();

            when(salesTransactionRepository.findByOrderIdForUpdate(204L)).thenReturn(Optional.of(tx));
            when(salesTransactionRepository.save(any(SalesTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(tablePaymentSessionRepository.findBySessionKeyForUpdate("TPS-SESSION-3")).thenReturn(Optional.of(session));
            when(tablePaymentSessionRepository.save(any(TablePaymentSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PaymentStatusDTO result = paymentService.markCashPaid(204L);

            assertThat(result.getStatus()).isEqualTo("PAID");
            assertThat(result.getPaymentMethod()).isEqualTo("CASH");
            assertThat(tx.getTablePaymentSessionKey()).isNull();
            assertThat(session.getStatus()).isEqualTo("CANCELLED");

            verify(tablePaymentSessionRepository).save(any(TablePaymentSession.class));
            }

    @Test
    @DisplayName("Webhook generic fail-closed nếu chưa cấu hình secret")
    void handleWebhook_failClosedWhenSecretMissing() {
        setField(paymentService, "webhookSecret", "");
        setField(paymentService, "allowInsecureWebhook", false);

        PaymentWebhookDTO webhook = PaymentWebhookDTO.builder()
                .orderId(104L)
                .status("PAID")
                .amount(BigDecimal.valueOf(110000))
                .providerTransactionId("tx-003")
                .build();

        assertThatThrownBy(() -> paymentService.handleWebhook(webhook, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("secret chưa được cấu hình");
    }

    @Test
    @DisplayName("Webhook generic insecure mode vẫn xử lý được khi bật cờ")
    void handleWebhook_allowInsecureForLocalTesting() {
        setField(paymentService, "webhookSecret", "");
        setField(paymentService, "allowInsecureWebhook", true);

        Order order = testOrder(105L, BigDecimal.valueOf(150000));
        SalesTransaction tx = pendingTx(order, BigDecimal.valueOf(150000));
        when(salesTransactionRepository.findByOrderIdForUpdate(105L)).thenReturn(Optional.of(tx));
        when(salesTransactionRepository.save(any(SalesTransaction.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentWebhookDTO webhook = PaymentWebhookDTO.builder()
                .orderId(105L)
                .status("PAID")
                .amount(BigDecimal.valueOf(150000))
                .providerTransactionId("tx-004")
                .build();

        PaymentStatusDTO result = paymentService.handleWebhook(webhook, null);

        assertThat(result.getStatus()).isEqualTo("PAID");
        assertThat(result.getPaymentMethod()).isEqualTo("QR");
        verify(salesTransactionRepository).save(any(SalesTransaction.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/orders-payment"), any(PaymentStatusDTO.class));
    }

    private Order testOrder(Long id, BigDecimal totalAmount) {
        return Order.builder()
                .id(id)
                .status(OrderStatus.COMPLETED)
                .totalAmount(totalAmount)
                .build();
    }

    private SalesTransaction pendingTx(Order order, BigDecimal totalAmount) {
        return SalesTransaction.builder()
                .id(order.getId())
                .order(order)
                .paymentMethod("PENDING")
                .totalAmount(totalAmount)
                .netAmount(totalAmount)
                .vatRate(BigDecimal.valueOf(8))
                .vatAmount(BigDecimal.ZERO)
                .build();
    }

    private static void setField(Object target, String fieldName, Object value) {
        try {
            Field field = PaymentServiceImpl.class.getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot set test field: " + fieldName, ex);
        }
    }
}
