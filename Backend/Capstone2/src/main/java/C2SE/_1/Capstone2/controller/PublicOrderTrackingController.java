package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.OrderTrackingDTO;
import C2SE._1.Capstone2.dto.PaymentStatusDTO;
import C2SE._1.Capstone2.entity.Order;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.repository.OrderRepository;
import C2SE._1.Capstone2.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/public/orders")
@RequiredArgsConstructor
public class PublicOrderTrackingController {

    private final OrderRepository orderRepository;
    private final PaymentService paymentService;

    @GetMapping("/track")
    public ResponseEntity<ApiResponse<List<OrderTrackingDTO>>> trackByCustomerPhone(
            @RequestParam(name = "customerPhone") String customerPhone
    ) {
        String normalizedPhone = normalizeCustomerPhone(customerPhone);
        List<Order> orders = orderRepository.findByCustomerPhoneOrderByCreatedAtDesc(normalizedPhone);
        if (orders == null || orders.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }

        // limit to latest N orders to keep response small
        List<Order> limited = orders.stream().limit(20).collect(Collectors.toList());
        List<Long> orderIds = limited.stream().map(Order::getId).collect(Collectors.toList());

        List<PaymentStatusDTO> payments = paymentService.getOrderPaymentStatuses(orderIds);
        Map<Long, PaymentStatusDTO> paymentByOrderId = payments.stream()
                .filter(p -> p.getOrderId() != null)
                .collect(Collectors.toMap(PaymentStatusDTO::getOrderId, p -> p, (a, b) -> a));

        List<OrderTrackingDTO> result = limited.stream().map(o -> {
            PaymentStatusDTO p = paymentByOrderId.get(o.getId());
            return OrderTrackingDTO.builder()
                    .orderId(o.getId())
                    .orderStatus(o.getStatus() == null ? null : o.getStatus().name())
                    .totalAmount(o.getTotalAmount())
                    .createdAt(o.getCreatedAt())
                    .paymentStatus(p == null ? "PENDING" : p.getStatus())
                    .paymentMethod(p == null ? "PENDING" : p.getPaymentMethod())
                    .build();
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    private String normalizeCustomerPhone(String customerPhone) {
        if (customerPhone == null) {
            throw new BadRequestException("Số điện thoại không hợp lệ");
        }
        String normalized = customerPhone.replaceAll("\\s+", "").trim();
        if (normalized.isEmpty()) {
            throw new BadRequestException("Số điện thoại không hợp lệ");
        }
        // Keep consistent with PublicOnlineOrderServiceImpl validation
        if (!normalized.matches("^[+0-9][0-9]{8,19}$")) {
            throw new BadRequestException("Số điện thoại không hợp lệ");
        }
        return normalized;
    }
}

