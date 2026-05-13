package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.PaymentInitDTO;
import C2SE._1.Capstone2.dto.PaymentStatusDTO;
import C2SE._1.Capstone2.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;

@RestController
@RequestMapping("/api/v1/public/payments")
@RequiredArgsConstructor
public class PublicPaymentController {

    private final PaymentService paymentService;

    @PostMapping("/orders/{orderId}/qr")
    public ResponseEntity<ApiResponse<PaymentInitDTO>> initQrPayment(
            @PathVariable Long orderId
    ) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.initQrPayment(orderId)));
    }

    @GetMapping("/orders/{orderId}/status")
    public ResponseEntity<ApiResponse<PaymentStatusDTO>> getOrderPaymentStatus(
            @PathVariable Long orderId
    ) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getOrderPaymentStatus(orderId)));
    }
}

