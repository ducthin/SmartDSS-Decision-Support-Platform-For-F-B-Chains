package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.*;
import C2SE._1.Capstone2.entity.*;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.OrderMapper;
import C2SE._1.Capstone2.repository.*;
import C2SE._1.Capstone2.service.QrOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class QrOrderServiceImpl implements QrOrderService {

    private final DiningTableRepository diningTableRepository;
    private final MenuItemRepository menuItemRepository;
    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;
    private final SimpMessagingTemplate messagingTemplate;

    private DiningTable validateAndGetTable(String qrToken) {
        DiningTable table = diningTableRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new ResourceNotFoundException("DiningTable", "qrToken", qrToken));
        if (!Boolean.TRUE.equals(table.getActive())) {
            throw new BadRequestException("Bàn này hiện không hoạt động");
        }
        return table;
    }

    @Override
    @Transactional(readOnly = true)
    public DiningTableDTO getTableInfo(String qrToken) {
        DiningTable table = validateAndGetTable(qrToken);
        return DiningTableDTO.builder()
                .id(table.getId())
                .name(table.getName())
                .active(table.getActive())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MenuItemDTO> getMenuForTable(String qrToken) {
        validateAndGetTable(qrToken);
        List<MenuItem> items = menuItemRepository.findByAvailableTrue();
        return items.stream().map(item -> MenuItemDTO.builder()
                .id(item.getId())
                .name(item.getName())
                .description(item.getDescription())
                .price(item.getPrice())
                .imageUrl(item.getImageUrl())
                .available(item.getAvailable())
                .categoryId(item.getCategory().getId())
                .categoryName(item.getCategory().getName())
                .build()).toList();
    }

    @Override
    public OrderDTO placeOrder(String qrToken, QrOrderDTO qrOrderDTO) {
        DiningTable table = validateAndGetTable(qrToken);

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
        OrderDTO result = orderMapper.toDTO(saved);
        messagingTemplate.convertAndSend("/topic/orders", result);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getTableOrders(String qrToken) {
        DiningTable table = diningTableRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new ResourceNotFoundException("DiningTable", "qrToken", qrToken));
        List<Order> orders = orderRepository.findByTableNumberOrderByCreatedAtDesc(table.getName());
        return orderMapper.toDTOList(orders);
    }
}
