package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.PaymentStatusDTO;
import C2SE._1.Capstone2.dto.PaymentWebhookDTO;
import C2SE._1.Capstone2.entity.Order;
import C2SE._1.Capstone2.entity.OrderStatus;
import C2SE._1.Capstone2.entity.SalesTransaction;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.repository.OrderRepository;
import C2SE._1.Capstone2.repository.SalesTransactionRepository;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private SalesTransactionRepository salesTransactionRepository;
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
