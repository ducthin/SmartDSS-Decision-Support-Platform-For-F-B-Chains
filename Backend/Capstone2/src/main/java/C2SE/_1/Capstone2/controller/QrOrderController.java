package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.*;
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
    public ResponseEntity<ApiResponse<List<OrderDTO>>> getTableOrders(@PathVariable String token) {
        return ResponseEntity.ok(ApiResponse.success(qrOrderService.getTableOrders(token)));
    }
}
