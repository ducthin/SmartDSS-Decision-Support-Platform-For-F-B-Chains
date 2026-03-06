package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.OrderDTO;
import C2SE._1.Capstone2.dto.OrderItemDTO;
import C2SE._1.Capstone2.entity.*;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.InsufficientStockException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.OrderMapper;
import C2SE._1.Capstone2.repository.*;
import C2SE._1.Capstone2.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

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

    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getAllOrders() {
        return orderMapper.toDTOList(orderRepository.findAll());
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
        User user = userRepository.findById(orderDTO.getCreatedById())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", orderDTO.getCreatedById()));

        Order order = Order.builder()
                .status(OrderStatus.PENDING)
                .note(orderDTO.getNote())
                .createdBy(user)
                .totalAmount(BigDecimal.ZERO)
                .build();

        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (OrderItemDTO itemDTO : orderDTO.getOrderItems()) {
            MenuItem menuItem = menuItemRepository.findById(itemDTO.getMenuItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("MenuItem", "id", itemDTO.getMenuItemId()));

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

        return orderMapper.toDTO(orderRepository.save(order));
    }

    @Override
    public OrderDTO updateOrderStatus(Long id, String status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));

        OrderStatus newStatus;
        try {
            newStatus = OrderStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid order status: " + status);
        }

        validateStatusTransition(order.getStatus(), newStatus);
        order.setStatus(newStatus);
        Order savedOrder = orderRepository.save(order);

        if (newStatus == OrderStatus.COMPLETED) {
            createSalesTransactionFromOrder(savedOrder);
            deductInventoryForOrder(savedOrder);
        }

        return orderMapper.toDTO(savedOrder);
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
        List<SalesItem> salesItems = new ArrayList<>();

        SalesTransaction salesTransaction = SalesTransaction.builder()
                .order(order)
                .totalAmount(order.getTotalAmount())
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

    private void deductInventoryForOrder(Order order) {
        for (OrderItem orderItem : order.getOrderItems()) {
            List<Recipe> recipes = recipeRepository.findByMenuItemId(orderItem.getMenuItem().getId());

            for (Recipe recipe : recipes) {
                BigDecimal totalDeduction = recipe.getQuantity()
                        .multiply(BigDecimal.valueOf(orderItem.getQuantity()));

                Inventory inventory = inventoryRepository.findByIngredientId(recipe.getIngredient().getId())
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

                InventoryTransaction transaction = InventoryTransaction.builder()
                        .inventory(inventory)
                        .type(TransactionType.DEDUCT)
                        .quantity(totalDeduction)
                        .reason("Order #" + order.getId() + " completed")
                        .build();
                inventoryTransactionRepository.save(transaction);
            }
        }
    }
}
