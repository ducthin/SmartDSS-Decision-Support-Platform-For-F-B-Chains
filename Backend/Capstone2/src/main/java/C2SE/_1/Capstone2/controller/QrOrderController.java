package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.*;
import C2SE._1.Capstone2.entity.*;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.OrderMapper;
import C2SE._1.Capstone2.repository.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/public/qr")
@RequiredArgsConstructor
public class QrOrderController {

    private final DiningTableRepository diningTableRepository;
    private final MenuItemRepository menuItemRepository;
    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;

    @GetMapping("/{token}/info")
    public ResponseEntity<ApiResponse<DiningTableDTO>> getTableInfo(@PathVariable String token) {
        DiningTable table = diningTableRepository.findByQrToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("DiningTable", "qrToken", token));
        if (!Boolean.TRUE.equals(table.getActive())) {
            throw new BadRequestException("Bàn này hiện không hoạt động");
        }
        DiningTableDTO dto = DiningTableDTO.builder()
                .id(table.getId())
                .name(table.getName())
                .active(table.getActive())
                .build();
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @GetMapping("/{token}/menu")
    public ResponseEntity<ApiResponse<List<MenuItemDTO>>> getMenuForQr(@PathVariable String token) {
        DiningTable table = diningTableRepository.findByQrToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("DiningTable", "qrToken", token));
        if (!Boolean.TRUE.equals(table.getActive())) {
            throw new BadRequestException("Bàn này hiện không hoạt động");
        }

        List<MenuItem> items = menuItemRepository.findByAvailableTrue();
        List<MenuItemDTO> dtos = items.stream().map(item -> MenuItemDTO.builder()
                .id(item.getId())
                .name(item.getName())
                .description(item.getDescription())
                .price(item.getPrice())
                .imageUrl(item.getImageUrl())
                .available(item.getAvailable())
                .categoryId(item.getCategory().getId())
                .categoryName(item.getCategory().getName())
                .build()).toList();

        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PostMapping("/{token}/order")
    @Transactional
    public ResponseEntity<ApiResponse<OrderDTO>> placeQrOrder(
            @PathVariable String token,
            @Valid @RequestBody QrOrderDTO qrOrderDTO) {
        DiningTable table = diningTableRepository.findByQrToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("DiningTable", "qrToken", token));
        if (!Boolean.TRUE.equals(table.getActive())) {
            throw new BadRequestException("Bàn này hiện không hoạt động");
        }

        Order order = Order.builder()
                .status(OrderStatus.PENDING)
                .note(qrOrderDTO.getNote())
                .tableNumber(table.getName())
                .createdBy(null)
                .totalAmount(BigDecimal.ZERO)
                .build();

        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (OrderItemDTO itemDTO : qrOrderDTO.getOrderItems()) {
            MenuItem menuItem = menuItemRepository.findById(itemDTO.getMenuItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("MenuItem", "id", itemDTO.getMenuItemId()));

            if (!Boolean.TRUE.equals(menuItem.getAvailable())) {
                throw new BadRequestException("Món \"" + menuItem.getName() + "\" hiện không còn phục vụ");
            }

            BigDecimal unitPrice = menuItem.getPrice();
            BigDecimal subtotal = unitPrice.multiply(BigDecimal.valueOf(itemDTO.getQuantity()));

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .menuItem(menuItem)
                    .quantity(itemDTO.getQuantity())
                    .unitPrice(unitPrice)
                    .subtotal(subtotal)
                    .build();

            orderItems.add(orderItem);
            totalAmount = totalAmount.add(subtotal);
        }

        order.setOrderItems(orderItems);
        order.setTotalAmount(totalAmount);

        Order saved = orderRepository.save(order);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(orderMapper.toDTO(saved)));
    }

    @GetMapping("/{token}/orders")
    public ResponseEntity<ApiResponse<List<OrderDTO>>> getTableOrders(@PathVariable String token) {
        DiningTable table = diningTableRepository.findByQrToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("DiningTable", "qrToken", token));

        List<Order> orders = orderRepository.findByTableNumberOrderByCreatedAtDesc(table.getName());
        return ResponseEntity.ok(ApiResponse.success(orderMapper.toDTOList(orders)));
    }
}
