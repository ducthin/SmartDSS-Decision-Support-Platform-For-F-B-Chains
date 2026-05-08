package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.OrderDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.dto.QrDiscountPreviewDTO;
import C2SE._1.Capstone2.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<OrderDTO>>> getAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String source) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Order.desc("id"), Sort.Order.desc("createdAt")));
        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(ApiResponse.success(orderService.getOrdersByStatus(status, pageable, keyword, source)));
        }
        return ResponseEntity.ok(ApiResponse.success(orderService.getAllOrders(pageable, keyword, source)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderDTO>> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrderById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OrderDTO>> createOrder(@Valid @RequestBody OrderDTO orderDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(orderService.createOrder(orderDTO)));
    }

    @GetMapping("/discount-preview")
    public ResponseEntity<ApiResponse<QrDiscountPreviewDTO>> previewDiscount(
            @RequestParam java.math.BigDecimal subtotal,
            @RequestParam(required = false) String voucherCode,
            @RequestParam(required = false) String customerPhone) {
        return ResponseEntity.ok(ApiResponse.success(orderService.previewDiscount(subtotal, voucherCode, customerPhone)));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<OrderDTO>> updateOrderStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            throw new C2SE._1.Capstone2.exception.BadRequestException("Trạng thái đơn hàng không được để trống");
        }
        return ResponseEntity.ok(ApiResponse.success(orderService.updateOrderStatus(id, status)));
    }
}
