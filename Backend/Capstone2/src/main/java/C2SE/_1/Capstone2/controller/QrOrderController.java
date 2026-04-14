package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.*;
import C2SE._1.Capstone2.service.CustomerFeedbackService;
import C2SE._1.Capstone2.service.QrOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public/qr")
@RequiredArgsConstructor
public class QrOrderController {

    private final QrOrderService qrOrderService;
    private final CustomerFeedbackService customerFeedbackService;

    @GetMapping("/{token}/info")
    public ResponseEntity<ApiResponse<DiningTableDTO>> getTableInfo(@PathVariable String token) {
        return ResponseEntity.ok(ApiResponse.success(qrOrderService.getTableInfo(token)));
    }

    @GetMapping("/{token}/menu")
    public ResponseEntity<ApiResponse<List<MenuItemDTO>>> getMenuForQr(@PathVariable String token) {
        return ResponseEntity.ok(ApiResponse.success(qrOrderService.getMenuForTable(token)));
    }

    @PostMapping("/{token}/order")
    public ResponseEntity<ApiResponse<OrderDTO>> placeQrOrder(
            @PathVariable String token,
            @Valid @RequestBody QrOrderDTO qrOrderDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(qrOrderService.placeOrder(token, qrOrderDTO)));
    }

    @GetMapping("/{token}/orders")
    public ResponseEntity<ApiResponse<List<OrderDTO>>> getTableOrders(
            @PathVariable String token,
            @RequestParam(name = "sessionId", required = false) String sessionId) {
        return ResponseEntity.ok(ApiResponse.success(qrOrderService.getTableOrders(token, sessionId)));
    }

    @PostMapping("/{token}/call")
    public ResponseEntity<ApiResponse<StaffCallDTO>> callStaff(
            @PathVariable String token,
            @Valid @RequestBody(required = false) QrStaffCallDTO callDTO) {
        QrStaffCallDTO safeDto = callDTO != null ? callDTO : QrStaffCallDTO.builder().build();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(qrOrderService.callStaff(token, safeDto)));
    }

    @PostMapping(value = "/{token}/feedback", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<CustomerFeedbackDTO>> submitFeedback(
            @PathVariable String token,
            @Valid @ModelAttribute QrFeedbackDTO feedbackDTO
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(customerFeedbackService.submitFeedback(token, feedbackDTO)));
    }
}
