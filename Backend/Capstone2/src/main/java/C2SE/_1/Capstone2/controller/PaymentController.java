package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.TableCashSettlementResultDTO;
import C2SE._1.Capstone2.dto.PaymentInitDTO;
import C2SE._1.Capstone2.dto.PaymentStatusDTO;
import C2SE._1.Capstone2.dto.TableQrInitDTO;
import C2SE._1.Capstone2.dto.TableSettlementDetailDTO;
import C2SE._1.Capstone2.dto.TableSettlementSummaryDTO;
import C2SE._1.Capstone2.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    @PostMapping("/tables/cash")
    public ResponseEntity<ApiResponse<TableCashSettlementResultDTO>> markTableCashPaid(
            @RequestParam(name = "tableNumber") String tableNumber) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.markTableCashPaid(tableNumber)));
    }

    @PostMapping("/tables/qr")
    public ResponseEntity<ApiResponse<TableQrInitDTO>> initTableQrPayment(
            @RequestParam(name = "tableNumber") String tableNumber) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.initTableQrPayment(tableNumber)));
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

    @GetMapping("/tables/settlement-summary")
    public ResponseEntity<ApiResponse<List<TableSettlementSummaryDTO>>> getTableSettlementSummary() {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getTableSettlementSummary()));
    }

    @GetMapping("/features")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> getPaymentFeatures() {
        Map<String, Boolean> features = new HashMap<>();
        features.put("tableSettlementDetail", true);
        features.put("groupedTableQrSession", true);
        return ResponseEntity.ok(ApiResponse.success(features));
    }

    @GetMapping("/tables/detail")
    public ResponseEntity<ApiResponse<TableSettlementDetailDTO>> getTableSettlementDetail(
            @RequestParam(name = "tableNumber") String tableNumber) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getTableSettlementDetail(tableNumber)));
    }
}
