package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.*;
import C2SE._1.Capstone2.entity.*;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.InsufficientStockException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.OrderMapper;
import C2SE._1.Capstone2.repository.*;
import C2SE._1.Capstone2.service.QrOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class QrOrderServiceImpl implements QrOrderService {

    private final DiningTableRepository diningTableRepository;
    private final MenuItemRepository menuItemRepository;
    private final OrderRepository orderRepository;
    private final StaffCallRepository staffCallRepository;
    private final RecipeRepository recipeRepository;
    private final InventoryRepository inventoryRepository;
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

        validateInventoryAvailability(orderItems);

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

    @Override
    public StaffCallDTO callStaff(String qrToken, QrStaffCallDTO callDTO) {
        DiningTable table = validateAndGetTable(qrToken);
        String tableName = table.getName();

        staffCallRepository.findTopByTableNameOrderByCreatedAtDesc(tableName).ifPresent(last -> {
            if (last.getCreatedAt() != null) {
                Duration since = Duration.between(last.getCreatedAt(), java.time.LocalDateTime.now());
                if (since.getSeconds() < 20) {
                    throw new BadRequestException("Bạn vừa gọi nhân viên, vui lòng chờ một chút rồi thử lại");
                }
            }
        });

        StaffCall call = StaffCall.builder()
                .tableName(tableName)
                .message(callDTO != null ? callDTO.getMessage() : null)
                .build();

        StaffCall saved = staffCallRepository.save(call);
        StaffCallDTO dto = StaffCallDTO.builder()
                .id(saved.getId())
                .tableName(saved.getTableName())
                .message(saved.getMessage())
                .createdAt(saved.getCreatedAt())
                .build();

        messagingTemplate.convertAndSend("/topic/staff-calls", dto);
        return dto;
    }

    private void validateInventoryAvailability(List<OrderItem> orderItems) {
        Map<Long, BigDecimal> requiredByIngredient = new HashMap<>();

        for (OrderItem orderItem : orderItems) {
            List<Recipe> recipes = recipeRepository.findByMenuItemId(orderItem.getMenuItem().getId());
            for (Recipe recipe : recipes) {
                BigDecimal required = recipe.getQuantity()
                        .multiply(BigDecimal.valueOf(orderItem.getQuantity()));
                requiredByIngredient.merge(recipe.getIngredient().getId(), required, BigDecimal::add);
            }
        }

        for (Map.Entry<Long, BigDecimal> entry : requiredByIngredient.entrySet()) {
            Long ingredientId = entry.getKey();
            BigDecimal required = entry.getValue();

            Inventory inventory = inventoryRepository.findByIngredientIdForUpdate(ingredientId)
                    .orElseThrow(() -> new ResourceNotFoundException("Inventory", "ingredientId", ingredientId));

            if (inventory.getQuantity().compareTo(required) < 0) {
                throw new InsufficientStockException(
                        "Insufficient stock for ingredient: " + inventory.getIngredient().getName()
                                + ". Available: " + inventory.getQuantity()
                                + ", Required: " + required);
            }
        }
    }
}
