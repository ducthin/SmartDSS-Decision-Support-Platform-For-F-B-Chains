package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.OrderDTO;
import C2SE._1.Capstone2.dto.OrderItemDTO;
import C2SE._1.Capstone2.dto.PublicOnlineOrderDTO;
import C2SE._1.Capstone2.dto.QrDiscountPreviewDTO;
import C2SE._1.Capstone2.entity.Inventory;
import C2SE._1.Capstone2.entity.MenuItem;
import C2SE._1.Capstone2.entity.Order;
import C2SE._1.Capstone2.entity.OrderItem;
import C2SE._1.Capstone2.entity.OrderStatus;
import C2SE._1.Capstone2.entity.Recipe;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.InsufficientStockException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.OrderMapper;
import C2SE._1.Capstone2.repository.InventoryRepository;
import C2SE._1.Capstone2.repository.MenuItemRepository;
import C2SE._1.Capstone2.repository.OrderRepository;
import C2SE._1.Capstone2.repository.RecipeRepository;
import C2SE._1.Capstone2.service.OrderDiscountService;
import C2SE._1.Capstone2.service.PublicOnlineOrderService;
import C2SE._1.Capstone2.util.DrinkOrderPricingHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import C2SE._1.Capstone2.util.TimeUtil;

@Service
@RequiredArgsConstructor
@Transactional
public class PublicOnlineOrderServiceImpl implements PublicOnlineOrderService {

    private static final String ONLINE_ORDER_MARKER = "ONLINE";

    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final RecipeRepository recipeRepository;
    private final InventoryRepository inventoryRepository;
    private final OrderMapper orderMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final DrinkOrderPricingHelper drinkOrderPricingHelper;
    private final OrderDiscountService orderDiscountService;

    @Override
    public OrderDTO createOnlineOrder(PublicOnlineOrderDTO dto) {
        Order order = Order.builder()
                .status(OrderStatus.PENDING)
                .note(buildOrderNote(dto))
                .tableNumber(ONLINE_ORDER_MARKER)
                .customerPhone(normalizeCustomerPhone(dto.getCustomerPhone()))
                .createdBy(null)
                .totalAmount(BigDecimal.ZERO)
                .build();

        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (OrderItemDTO itemDTO : dto.getOrderItems()) {
            MenuItem menuItem = menuItemRepository.findById(itemDTO.getMenuItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("MenuItem", "id", itemDTO.getMenuItemId()));
            if (!Boolean.TRUE.equals(menuItem.getAvailable())) {
                throw new BadRequestException("Món \"" + menuItem.getName() + "\" hiện không còn phục vụ");
            }

            DrinkOrderPricingHelper.ResolvedDrinkLine resolved = drinkOrderPricingHelper.resolve(
                    menuItem,
                    itemDTO.getSelectedSizeCode(),
                    itemDTO.getSelectedToppingCodes());
            BigDecimal unitPrice = resolved.unitPrice();
            BigDecimal subtotal = unitPrice.multiply(BigDecimal.valueOf(itemDTO.getQuantity()));

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .menuItem(menuItem)
                    .quantity(itemDTO.getQuantity())
                    .unitPrice(unitPrice)
                    .subtotal(subtotal)
                    .selectedSizeCode(resolved.sizeCode())
                    .selectedSizeLabel(resolved.sizeLabel())
                    .selectedToppingsJson(resolved.toppingsJson())
                    .build();
            orderItems.add(orderItem);
            totalAmount = totalAmount.add(subtotal);
        }

        validateInventoryAvailability(orderItems);

        BigDecimal subtotalAmount = totalAmount;
        OrderDiscountService.DiscountResult discountResult = orderDiscountService.calculate(
                subtotalAmount,
                dto.getVoucherCode(),
                order.getCustomerPhone(),
                TimeUtil.todayVN());
        BigDecimal finalTotalAmount = subtotalAmount.subtract(discountResult.totalDiscountAmount()).max(BigDecimal.ZERO);

        order.setOrderItems(orderItems);
        order.setSubtotalAmount(subtotalAmount);
        order.setDiscountAmount(discountResult.totalDiscountAmount());
        order.setVoucherCode(discountResult.normalizedVoucherCodesJoined());
        order.setPromotionNote(discountResult.promotionNote());
        order.setTotalAmount(finalTotalAmount);

        OrderDTO result = orderMapper.toDTO(orderRepository.save(order));
        messagingTemplate.convertAndSend("/topic/orders", result);
        // Public realtime topic for anonymous customers tracking online orders by phone
        messagingTemplate.convertAndSend("/topic/public-orders", result);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public QrDiscountPreviewDTO previewDiscount(BigDecimal subtotal, String voucherCode, String customerPhone) {
        BigDecimal safeSubtotal = subtotal == null ? BigDecimal.ZERO : subtotal.max(BigDecimal.ZERO);
        try {
            OrderDiscountService.DiscountResult discountResult = orderDiscountService.preview(
                    safeSubtotal,
                    voucherCode,
                    normalizeCustomerPhone(customerPhone),
                    TimeUtil.todayVN());
            BigDecimal finalAmount = safeSubtotal.subtract(discountResult.totalDiscountAmount()).max(BigDecimal.ZERO);
            return QrDiscountPreviewDTO.builder()
                    .subtotalAmount(safeSubtotal)
                    .calendarDiscountPercent(discountResult.calendarDiscountPercent())
                    .calendarDiscountLabel(discountResult.calendarDiscountLabel())
                    .calendarDiscountAmount(discountResult.calendarDiscountAmount())
                    .voucherDiscountAmount(discountResult.voucherDiscountAmount())
                    .totalDiscountAmount(discountResult.totalDiscountAmount())
                    .finalAmount(finalAmount)
                    .voucherCode(discountResult.normalizedVoucherCode())
                    .voucherCodes(discountResult.normalizedVoucherCodes())
                    .promotionNote(discountResult.promotionNote())
                    .build();
        } catch (BadRequestException ex) {
            OrderDiscountService.DiscountResult calendarOnly = orderDiscountService.preview(
                    safeSubtotal,
                    null,
                    normalizeCustomerPhone(customerPhone),
                    TimeUtil.todayVN());
            BigDecimal finalAmount = safeSubtotal.subtract(calendarOnly.totalDiscountAmount()).max(BigDecimal.ZERO);
            return QrDiscountPreviewDTO.builder()
                    .subtotalAmount(safeSubtotal)
                    .calendarDiscountPercent(calendarOnly.calendarDiscountPercent())
                    .calendarDiscountLabel(calendarOnly.calendarDiscountLabel())
                    .calendarDiscountAmount(calendarOnly.calendarDiscountAmount())
                    .voucherDiscountAmount(BigDecimal.ZERO)
                    .totalDiscountAmount(calendarOnly.totalDiscountAmount())
                    .finalAmount(finalAmount)
                    .voucherError(ex.getMessage())
                    .promotionNote(calendarOnly.promotionNote())
                    .build();
        }
    }

    private String buildOrderNote(PublicOnlineOrderDTO dto) {
        String customerName = dto.getCustomerName() == null ? "" : dto.getCustomerName().trim();
        String deliveryAddress = dto.getDeliveryAddress() == null ? "" : dto.getDeliveryAddress().trim();
        String customerNote = dto.getNote() == null ? "" : dto.getNote().trim();
        StringBuilder sb = new StringBuilder();
        sb.append("[ONLINE] Khách: ").append(customerName.isBlank() ? "N/A" : customerName);
        if (!deliveryAddress.isBlank()) {
            sb.append(" | Địa chỉ giao: ").append(deliveryAddress);
        }
        if (!customerNote.isBlank()) {
            sb.append(" | Ghi chú: ").append(customerNote);
        }
        return sb.toString();
    }

    private void validateInventoryAvailability(List<OrderItem> orderItems) {
        Map<Long, BigDecimal> requiredByIngredient = new HashMap<>();
        for (OrderItem orderItem : orderItems) {
            List<Recipe> recipes = recipeRepository.findByMenuItemId(orderItem.getMenuItem().getId());
            for (Recipe recipe : recipes) {
                BigDecimal required = recipe.getQuantity().multiply(BigDecimal.valueOf(orderItem.getQuantity()));
                requiredByIngredient.merge(recipe.getIngredient().getId(), required, BigDecimal::add);
            }
        }
        for (Map.Entry<Long, BigDecimal> entry : requiredByIngredient.entrySet()) {
            Inventory inventory = inventoryRepository.findByIngredientIdForUpdate(entry.getKey())
                    .orElseThrow(() -> new ResourceNotFoundException("Inventory", "ingredientId", entry.getKey()));
            if (inventory.getQuantity().compareTo(entry.getValue()) < 0) {
                throw new InsufficientStockException(
                        "Insufficient stock for ingredient: " + inventory.getIngredient().getName()
                                + ". Available: " + inventory.getQuantity()
                                + ", Required: " + entry.getValue());
            }
        }
    }

    private String normalizeCustomerPhone(String customerPhone) {
        if (customerPhone == null) return null;
        String normalized = customerPhone.replaceAll("\\s+", "").trim();
        if (normalized.isEmpty()) return null;
        if (!normalized.matches("^[+0-9][0-9]{8,19}$")) {
            throw new BadRequestException("Số điện thoại không hợp lệ");
        }
        return normalized;
    }
}
