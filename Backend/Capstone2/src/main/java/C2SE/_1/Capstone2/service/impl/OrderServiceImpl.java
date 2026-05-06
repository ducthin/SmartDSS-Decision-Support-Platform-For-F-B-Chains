package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.OrderDTO;
import C2SE._1.Capstone2.dto.OrderItemDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.dto.QrDiscountPreviewDTO;
import C2SE._1.Capstone2.entity.*;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.InsufficientStockException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.OrderMapper;
import C2SE._1.Capstone2.repository.*;
import C2SE._1.Capstone2.service.CustomerLoyaltyAccountService;
import C2SE._1.Capstone2.service.OrderDiscountService;
import C2SE._1.Capstone2.service.OrderService;
import C2SE._1.Capstone2.util.DrinkOrderPricingHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final UserRepository userRepository;
    private final RecipeRepository recipeRepository;
    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final SalesTransactionRepository salesTransactionRepository;
    private final OrderMapper orderMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final DrinkOrderPricingHelper drinkOrderPricingHelper;
    private final OrderDiscountService orderDiscountService;
    private final CustomerLoyaltyAccountService customerLoyaltyAccountService;
    @Value("${app.tax.vat.rate-percent:8}")
    private BigDecimal vatRatePercent;
    @Value("${app.tax.vat.price-includes-vat:true}")
    private boolean priceIncludesVat;

    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getAllOrders() {
        return orderMapper.toDTOList(orderRepository.findAll());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderDTO> getAllOrders(Pageable pageable) {
        return getAllOrders(pageable, null);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderDTO> getAllOrders(Pageable pageable, String keyword) {
        Long orderId = parseOrderIdKeyword(keyword);
        if (Long.valueOf(Long.MIN_VALUE).equals(orderId)) {
            return PageResponse.of(Page.empty(pageable), List.of());
        }
        if (orderId != null) {
            Page<Order> page = orderRepository.searchById(orderId, pageable);
            return PageResponse.of(page, orderMapper.toDTOList(page.getContent()));
        }

        Page<Order> page = orderRepository.findAll(pageable);
        return PageResponse.of(page, orderMapper.toDTOList(page.getContent()));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderDTO> getOrdersByStatus(String status, Pageable pageable) {
        return getOrdersByStatus(status, pageable, null);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderDTO> getOrdersByStatus(String status, Pageable pageable, String keyword) {
        OrderStatus orderStatus;
        try {
            orderStatus = OrderStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid order status: " + status);
        }

        Long orderId = parseOrderIdKeyword(keyword);
        if (Long.valueOf(Long.MIN_VALUE).equals(orderId)) {
            return PageResponse.of(Page.empty(pageable), List.of());
        }
        Page<Order> page = orderId != null
                ? orderRepository.searchByStatusAndId(orderStatus, orderId, pageable)
                : orderRepository.findByStatus(orderStatus, pageable);
        return PageResponse.of(page, orderMapper.toDTOList(page.getContent()));
    }

    private Long parseOrderIdKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }
        String normalized = keyword.trim().replaceFirst("^#", "");
        if (normalized.isBlank()) {
            return null;
        }
        try {
            long parsed = Long.parseLong(normalized);
            return parsed > 0 ? parsed : null;
        } catch (NumberFormatException ex) {
            return Long.MIN_VALUE;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public OrderDTO getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));
        return orderMapper.toDTO(order);
    }

    @Override
    public OrderDTO createOrder(OrderDTO orderDTO) {
        requireAnyRole(RoleName.ADMIN, RoleName.MANAGER, RoleName.STAFF);

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        Order order = Order.builder()
                .status(OrderStatus.PENDING)
                .note(orderDTO.getNote())
            .customerPhone(normalizeCustomerPhone(orderDTO.getCustomerPhone()))
                .createdBy(user)
                .totalAmount(BigDecimal.ZERO)
                .build();

        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (OrderItemDTO itemDTO : orderDTO.getOrderItems()) {
            MenuItem menuItem = menuItemRepository.findById(itemDTO.getMenuItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("MenuItem", "id", itemDTO.getMenuItemId()));

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
            orderDTO.getVoucherCode(),
            order.getCustomerPhone(),
            LocalDate.now());
        BigDecimal finalTotalAmount = subtotalAmount.subtract(discountResult.totalDiscountAmount()).max(BigDecimal.ZERO);

        order.setOrderItems(orderItems);
        order.setSubtotalAmount(subtotalAmount);
        order.setDiscountAmount(discountResult.totalDiscountAmount());
        order.setVoucherCode(discountResult.normalizedVoucherCodesJoined());
        order.setPromotionNote(discountResult.promotionNote());
        order.setTotalAmount(finalTotalAmount);

        OrderDTO result = orderMapper.toDTO(orderRepository.save(order));
        messagingTemplate.convertAndSend("/topic/orders", result);
        if ("ONLINE".equalsIgnoreCase(result.getTableNumber())) {
            messagingTemplate.convertAndSend("/topic/public-orders", result);
        }
        if (result.getQrClientSessionId() != null && !result.getQrClientSessionId().isBlank()) {
            messagingTemplate.convertAndSend("/topic/qr-orders/" + result.getQrClientSessionId(), result);
        }
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
                    LocalDate.now());
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
                    LocalDate.now());
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

    @Override
    public OrderDTO updateOrderStatus(Long id, String status) {
        Order order = orderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));

        OrderStatus newStatus;
        try {
            newStatus = OrderStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid order status: " + status);
        }

        OrderStatus currentStatus = order.getStatus();
        validateStatusTransition(currentStatus, newStatus);

        // Permission by action
        if (newStatus == OrderStatus.PREPARING || newStatus == OrderStatus.COMPLETED) {
            requireAnyRole(RoleName.ADMIN, RoleName.MANAGER, RoleName.STAFF);
        } else if (newStatus == OrderStatus.CANCELLED) {
            requireAnyRole(RoleName.ADMIN, RoleName.MANAGER, RoleName.STAFF);
        }

        if (newStatus == OrderStatus.PREPARING) {
            reserveInventoryForOrder(order);
        }
        if (newStatus == OrderStatus.CANCELLED && currentStatus == OrderStatus.PREPARING) {
            releaseReservedInventoryForOrder(order);
        }

        order.setStatus(newStatus);
        Order savedOrder = orderRepository.save(order);

        if (newStatus == OrderStatus.COMPLETED) {
            createSalesTransactionFromOrder(savedOrder);
            int earnedPoints = customerLoyaltyAccountService.awardPointsForOrder(
                    savedOrder.getCustomerPhone(),
                    savedOrder.getTotalAmount());
            savedOrder.setLoyaltyPointsEarned(earnedPoints);
            savedOrder = orderRepository.save(savedOrder);
        }

        OrderDTO result = orderMapper.toDTO(savedOrder);
        messagingTemplate.convertAndSend("/topic/orders", result);
        if ("ONLINE".equalsIgnoreCase(result.getTableNumber())) {
            messagingTemplate.convertAndSend("/topic/public-orders", result);
        }
        if (result.getQrClientSessionId() != null && !result.getQrClientSessionId().isBlank()) {
            messagingTemplate.convertAndSend("/topic/qr-orders/" + result.getQrClientSessionId(), result);
        }
        return result;
    }

    private void requireAnyRole(RoleName... roles) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null) {
            throw new AccessDeniedException("Access denied");
        }

        for (RoleName role : roles) {
            String required = "ROLE_" + role.name();
            boolean match = auth.getAuthorities().stream().anyMatch(a -> required.equals(a.getAuthority()));
            if (match) return;
        }

        throw new AccessDeniedException("Access denied");
    }

    private void validateStatusTransition(OrderStatus current, OrderStatus next) {
        if (current == OrderStatus.COMPLETED || current == OrderStatus.CANCELLED) {
            throw new BadRequestException("Cannot change status of a " + current.name() + " order");
        }
        if (current == OrderStatus.PENDING && next != OrderStatus.PREPARING && next != OrderStatus.CANCELLED) {
            throw new BadRequestException("PENDING order can only move to PREPARING or CANCELLED");
        }
        if (current == OrderStatus.PREPARING && next != OrderStatus.COMPLETED && next != OrderStatus.CANCELLED) {
            throw new BadRequestException("PREPARING order can only move to COMPLETED or CANCELLED");
        }
    }

    private void createSalesTransactionFromOrder(Order order) {
        // Đơn online có thể đã được tạo SalesTransaction khi khởi tạo QR trước khi order chuyển COMPLETED.
        if (salesTransactionRepository.findByOrderId(order.getId()).isPresent()) {
            return;
        }

        List<SalesItem> salesItems = new ArrayList<>();
        BigDecimal grossAmount = order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount();
        BigDecimal rate = vatRatePercent.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
        BigDecimal netAmount;
        BigDecimal vatAmount;

        if (priceIncludesVat) {
            BigDecimal divisor = BigDecimal.ONE.add(rate);
            netAmount = grossAmount.divide(divisor, 0, RoundingMode.HALF_UP);
            vatAmount = grossAmount.subtract(netAmount);
        } else {
            netAmount = grossAmount;
            vatAmount = netAmount.multiply(rate).setScale(0, RoundingMode.HALF_UP);
            grossAmount = netAmount.add(vatAmount);
        }

        SalesTransaction salesTransaction = SalesTransaction.builder()
                .order(order)
                .netAmount(netAmount)
                .vatRate(vatRatePercent)
                .vatAmount(vatAmount)
                .totalAmount(grossAmount)
                .paymentMethod("PENDING")
                .cashier(order.getCreatedBy())
                .build();

        for (OrderItem orderItem : order.getOrderItems()) {
            SalesItem salesItem = SalesItem.builder()
                    .salesTransaction(salesTransaction)
                    .menuItem(orderItem.getMenuItem())
                    .quantity(orderItem.getQuantity())
                    .unitPrice(orderItem.getUnitPrice())
                    .subtotal(orderItem.getSubtotal())
                    .build();
            salesItems.add(salesItem);
        }

        salesTransaction.setSalesItems(salesItems);
        salesTransactionRepository.save(salesTransaction);
    }

    private void reserveInventoryForOrder(Order order) {
        for (OrderItem orderItem : order.getOrderItems()) {
            List<Recipe> recipes = recipeRepository.findByMenuItemId(orderItem.getMenuItem().getId());

            for (Recipe recipe : recipes) {
                BigDecimal totalDeduction = recipe.getQuantity()
                        .multiply(BigDecimal.valueOf(orderItem.getQuantity()));

                Inventory inventory = inventoryRepository.findByIngredientIdForUpdate(recipe.getIngredient().getId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Inventory", "ingredientId", recipe.getIngredient().getId()));

                if (inventory.getQuantity().compareTo(totalDeduction) < 0) {
                    throw new InsufficientStockException(
                            "Insufficient stock for ingredient: " + recipe.getIngredient().getName()
                            + ". Available: " + inventory.getQuantity()
                            + ", Required: " + totalDeduction);
                }

                inventory.setQuantity(inventory.getQuantity().subtract(totalDeduction));
                inventoryRepository.save(inventory);

                BigDecimal unitPrice = inventory.getUnitCost() == null
                    ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                    : inventory.getUnitCost().setScale(2, RoundingMode.HALF_UP);
                BigDecimal totalAmount = totalDeduction.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);

                InventoryTransaction transaction = InventoryTransaction.builder()
                        .inventory(inventory)
                        .type(TransactionType.DEDUCT)
                        .quantity(totalDeduction)
                    .unitPrice(unitPrice)
                    .totalAmount(totalAmount)
                        .reason("Order #" + order.getId() + " reserved (PREPARING)")
                        .build();
                inventoryTransactionRepository.save(transaction);
            }
        }
    }

    private void releaseReservedInventoryForOrder(Order order) {
        for (OrderItem orderItem : order.getOrderItems()) {
            List<Recipe> recipes = recipeRepository.findByMenuItemId(orderItem.getMenuItem().getId());

            for (Recipe recipe : recipes) {
                BigDecimal totalRestore = recipe.getQuantity()
                        .multiply(BigDecimal.valueOf(orderItem.getQuantity()));

                Inventory inventory = inventoryRepository.findByIngredientIdForUpdate(recipe.getIngredient().getId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Inventory", "ingredientId", recipe.getIngredient().getId()));

                inventory.setQuantity(inventory.getQuantity().add(totalRestore));
                inventoryRepository.save(inventory);

                BigDecimal unitPrice = inventory.getUnitCost() == null
                    ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                    : inventory.getUnitCost().setScale(2, RoundingMode.HALF_UP);
                BigDecimal totalAmount = totalRestore.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);

                InventoryTransaction transaction = InventoryTransaction.builder()
                        .inventory(inventory)
                        .type(TransactionType.ADD)
                        .quantity(totalRestore)
                    .unitPrice(unitPrice)
                    .totalAmount(totalAmount)
                        .reason("Order #" + order.getId() + " cancelled (release reserved)")
                        .build();
                inventoryTransactionRepository.save(transaction);
            }
        }
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

    private String normalizeCustomerPhone(String customerPhone) {
        if (customerPhone == null) {
            return null;
        }
        String normalized = customerPhone.replaceAll("\\s+", "").trim();
        if (normalized.isEmpty()) {
            return null;
        }
        if (!normalized.matches("^[+0-9][0-9]{8,19}$")) {
            throw new BadRequestException("Số điện thoại không hợp lệ");
        }
        return normalized;
    }
}
