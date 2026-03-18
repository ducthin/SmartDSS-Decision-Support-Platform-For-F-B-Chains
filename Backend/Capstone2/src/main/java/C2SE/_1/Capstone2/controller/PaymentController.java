package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.PaymentInitDTO;
import C2SE._1.Capstone2.dto.PaymentStatusDTO;
import C2SE._1.Capstone2.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/orders/{orderId}/qr")
    public ResponseEntity<ApiResponse<PaymentInitDTO>> initQrPayment(@PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.initQrPayment(orderId)));
    }

    @PostMapping("/orders/{orderId}/cash")
    public ResponseEntity<ApiResponse<PaymentStatusDTO>> markCashPaid(@PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.markCashPaid(orderId)));
    }

    @GetMapping("/orders/{orderId}/status")
    public ResponseEntity<ApiResponse<PaymentStatusDTO>> getOrderPaymentStatus(@PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getOrderPaymentStatus(orderId)));
    }

    @GetMapping("/orders/statuses")
    public ResponseEntity<ApiResponse<List<PaymentStatusDTO>>> getOrderPaymentStatuses(
            @RequestParam(name = "orderIds") List<Long> orderIds) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getOrderPaymentStatuses(orderIds)));
    }
}
