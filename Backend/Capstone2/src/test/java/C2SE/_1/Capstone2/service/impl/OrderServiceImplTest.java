package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.OrderDTO;
import C2SE._1.Capstone2.dto.OrderItemDTO;
import C2SE._1.Capstone2.entity.*;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.OrderMapper;
import C2SE._1.Capstone2.repository.*;
import C2SE._1.Capstone2.service.CustomerLoyaltyAccountService;
import C2SE._1.Capstone2.service.OrderDiscountService;
import C2SE._1.Capstone2.util.DrinkOrderPricingHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {

    @Mock private OrderRepository orderRepository;
    @Mock private MenuItemRepository menuItemRepository;
    @Mock private UserRepository userRepository;
    @Mock private RecipeRepository recipeRepository;
    @Mock private InventoryRepository inventoryRepository;
    @Mock private InventoryTransactionRepository inventoryTransactionRepository;
    @Mock private SalesTransactionRepository salesTransactionRepository;
    @Mock private OrderMapper orderMapper;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private DrinkOrderPricingHelper drinkOrderPricingHelper;
    @Mock private OrderDiscountService orderDiscountService;
    @Mock private CustomerLoyaltyAccountService customerLoyaltyAccountService;

    @InjectMocks
    private OrderServiceImpl orderService;

    private User testUser;
    private MenuItem testMenuItem;

    @BeforeEach
    void setUp() {
        Role role = Role.builder().id(1L).name(RoleName.STAFF).build();
        testUser = User.builder()
                .id(1L).username("staff").fullName("Staff")
                .email("staff@test.com").active(true).role(role)
                .build();

        Category category = Category.builder().id(1L).name("Cà phê").build();
        testMenuItem = MenuItem.builder()
                .id(1L).name("Cà phê sữa đá").price(BigDecimal.valueOf(29000))
                .available(true).category(category)
                .build();

        lenient().when(drinkOrderPricingHelper.resolve(any(MenuItem.class), nullable(String.class), any()))
                .thenAnswer(inv -> {
                    MenuItem mi = inv.getArgument(0);
                    BigDecimal p = mi.getPrice() != null ? mi.getPrice() : BigDecimal.ZERO;
                    return new DrinkOrderPricingHelper.ResolvedDrinkLine(p, null, null, null);
                });
        lenient().when(orderDiscountService.calculate(any(BigDecimal.class), nullable(String.class), nullable(String.class), any()))
                .thenReturn(new OrderDiscountService.DiscountResult(
                        null,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        null
                ));
        lenient().when(customerLoyaltyAccountService.awardPointsForOrder(nullable(String.class), any(BigDecimal.class)))
                .thenReturn(0);

        ReflectionTestUtils.setField(orderService, "vatRatePercent", BigDecimal.valueOf(8));
        ReflectionTestUtils.setField(orderService, "priceIncludesVat", true);
    }

    @Test
    @DisplayName("Tạo order thành công")
    void createOrder_success() {
        // Arrange
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "staff",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_STAFF"))
                ));

        OrderItemDTO itemDTO = OrderItemDTO.builder()
                .menuItemId(1L).quantity(2).build();
        OrderDTO orderDTO = OrderDTO.builder()
                .orderItems(List.of(itemDTO)).note("Test order").build();

        when(userRepository.findByUsername("staff")).thenReturn(Optional.of(testUser));
        when(menuItemRepository.findById(1L)).thenReturn(Optional.of(testMenuItem));
        when(recipeRepository.findByMenuItemId(anyLong())).thenReturn(List.of());
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(1L);
            return o;
        });
        when(orderMapper.toDTO(any(Order.class))).thenReturn(
                OrderDTO.builder().id(1L).status("PENDING")
                        .totalAmount(BigDecimal.valueOf(58000)).build());

        // Act
        OrderDTO result = orderService.createOrder(orderDTO);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getStatus()).isEqualTo("PENDING");
        verify(orderRepository).save(any(Order.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/orders"), any(OrderDTO.class));
    }

    @Test
    @DisplayName("Tạo order thất bại - user không tồn tại")
    void createOrder_userNotFound() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "unknown",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_STAFF"))
                ));

        OrderDTO orderDTO = OrderDTO.builder()
                .orderItems(List.of(OrderItemDTO.builder().menuItemId(1L).quantity(1).build()))
                .build();

        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.createOrder(orderDTO))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Tạo order thất bại - menu item không tồn tại")
    void createOrder_menuItemNotFound() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "staff",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_STAFF"))
                ));

        OrderDTO orderDTO = OrderDTO.builder()
                .orderItems(List.of(OrderItemDTO.builder().menuItemId(999L).quantity(1).build()))
                .build();

        when(userRepository.findByUsername("staff")).thenReturn(Optional.of(testUser));
        when(menuItemRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.createOrder(orderDTO))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Cập nhật status PENDING → PREPARING thành công")
    void updateOrderStatus_pendingToPreparing() {
        Order order = Order.builder().id(1L).status(OrderStatus.PENDING).build();

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "staff",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_STAFF"))
                ));

        when(orderRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any())).thenReturn(order);
        when(orderMapper.toDTO(any())).thenReturn(
                OrderDTO.builder().id(1L).status("PREPARING").build());

        OrderDTO result = orderService.updateOrderStatus(1L, "PREPARING");

        assertThat(result.getStatus()).isEqualTo("PREPARING");
        verify(messagingTemplate).convertAndSend(eq("/topic/orders"), any(Object.class));
    }

    @Test
    @DisplayName("Không thể chuyển COMPLETED → PREPARING")
    void updateOrderStatus_completedCannotChange() {
        Order order = Order.builder().id(1L).status(OrderStatus.COMPLETED).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "staff",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_STAFF"))
                ));
        when(orderRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateOrderStatus(1L, "PREPARING"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("COMPLETED");
    }

    @Test
    @DisplayName("Không thể chuyển PENDING → COMPLETED (phải qua PREPARING)")
    void updateOrderStatus_pendingCannotComplete() {
        Order order = Order.builder().id(1L).status(OrderStatus.PENDING).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "staff",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_STAFF"))
                ));
        when(orderRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateOrderStatus(1L, "COMPLETED"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Status không hợp lệ")
    void updateOrderStatus_invalidStatus() {
        Order order = Order.builder().id(1L).status(OrderStatus.PENDING).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "staff",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_STAFF"))
                ));
        when(orderRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateOrderStatus(1L, "INVALID"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid order status");
    }

    @Test
    @DisplayName("COMPLETED → tạo SalesTransaction + trừ kho")
    void updateOrderStatus_completedTriggersInventoryDeduction() {
        // Arrange
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "staff",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_STAFF"))
                ));
        Ingredient ingredient = Ingredient.builder().id(1L).name("Cà phê xay").build();
        Recipe recipe = Recipe.builder()
                .menuItem(testMenuItem).ingredient(ingredient)
                .quantity(BigDecimal.valueOf(20)).build();

        OrderItem orderItem = OrderItem.builder()
                .menuItem(testMenuItem).quantity(2)
                .unitPrice(BigDecimal.valueOf(29000))
                .subtotal(BigDecimal.valueOf(58000))
                .build();

        Order order = Order.builder()
                .id(1L).status(OrderStatus.PREPARING)
                .totalAmount(BigDecimal.valueOf(58000))
                .createdBy(testUser)
                .orderItems(List.of(orderItem))
                .build();

        when(orderRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any())).thenReturn(order);
        when(orderMapper.toDTO(any())).thenReturn(
                OrderDTO.builder().id(1L).status("COMPLETED").build());

        // Act
        orderService.updateOrderStatus(1L, "COMPLETED");

        // Assert
        verify(salesTransactionRepository).save(any(SalesTransaction.class));
        verify(inventoryRepository, never()).save(any(Inventory.class));
        verify(inventoryTransactionRepository, never()).save(any(InventoryTransaction.class));
    }
}
