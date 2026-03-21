package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.*;
import C2SE._1.Capstone2.entity.*;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.MenuItemMapper;
import C2SE._1.Capstone2.mapper.OrderMapper;
import C2SE._1.Capstone2.repository.*;
import C2SE._1.Capstone2.util.DrinkOptionsJsonMapper;
import C2SE._1.Capstone2.util.DrinkOrderPricingHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QrOrderServiceImplTest {

    @Mock private DiningTableRepository diningTableRepository;
    @Mock private MenuItemRepository menuItemRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private RecipeRepository recipeRepository;
    @Mock private InventoryRepository inventoryRepository;
    @Mock private OrderMapper orderMapper;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private MenuItemMapper menuItemMapper;
    @Mock private DrinkOptionsJsonMapper drinkOptionsJsonMapper;
    @Mock private DrinkOrderPricingHelper drinkOrderPricingHelper;

    @InjectMocks
    private QrOrderServiceImpl qrOrderService;

    private DiningTable activeTable;
    private MenuItem testMenuItem;

    @BeforeEach
    void setUp() {
        activeTable = DiningTable.builder()
                .id(1L).name("Bàn 1").qrToken("test-token-123").active(true).build();

        Category cat = Category.builder().id(1L).name("Cà phê").build();
        testMenuItem = MenuItem.builder()
                .id(1L).name("Cà phê sữa đá").price(BigDecimal.valueOf(29000))
                .available(true).category(cat)
                .build();

        lenient().when(drinkOrderPricingHelper.resolve(any(MenuItem.class), nullable(String.class), any()))
                .thenAnswer(inv -> {
                    MenuItem mi = inv.getArgument(0);
                    BigDecimal p = mi.getPrice() != null ? mi.getPrice() : BigDecimal.ZERO;
                    return new DrinkOrderPricingHelper.ResolvedDrinkLine(p, null, null, null);
                });
    }

    @Test
    @DisplayName("Lấy thông tin bàn thành công")
    void getTableInfo_success() {
        when(diningTableRepository.findByQrToken("test-token-123"))
                .thenReturn(Optional.of(activeTable));

        DiningTableDTO result = qrOrderService.getTableInfo("test-token-123");

        assertThat(result.getName()).isEqualTo("Bàn 1");
        assertThat(result.getActive()).isTrue();
    }

    @Test
    @DisplayName("QR token không hợp lệ")
    void getTableInfo_invalidToken() {
        when(diningTableRepository.findByQrToken("bad-token"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> qrOrderService.getTableInfo("bad-token"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Bàn không hoạt động")
    void getTableInfo_inactiveTable() {
        activeTable.setActive(false);
        when(diningTableRepository.findByQrToken("test-token-123"))
                .thenReturn(Optional.of(activeTable));

        assertThatThrownBy(() -> qrOrderService.getTableInfo("test-token-123"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không hoạt động");
    }

    @Test
    @DisplayName("Đặt hàng QR thành công")
    void placeOrder_success() {
        QrOrderDTO qrOrder = QrOrderDTO.builder()
                .clientSessionId("sess-test-uuid-001")
                .note("Ít đường")
                .orderItems(List.of(OrderItemDTO.builder().menuItemId(1L).quantity(2).build()))
                .build();

        when(diningTableRepository.findByQrToken("test-token-123"))
                .thenReturn(Optional.of(activeTable));
        when(menuItemRepository.findById(1L)).thenReturn(Optional.of(testMenuItem));
        when(recipeRepository.findByMenuItemId(anyLong())).thenReturn(List.of());
        when(orderRepository.save(any())).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(1L);
            return o;
        });
        when(orderMapper.toDTO(any())).thenReturn(
                OrderDTO.builder().id(1L).status("PENDING")
                        .totalAmount(BigDecimal.valueOf(58000)).build());

        OrderDTO result = qrOrderService.placeOrder("test-token-123", qrOrder);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getStatus()).isEqualTo("PENDING");
        verify(messagingTemplate).convertAndSend(eq("/topic/orders"), any(OrderDTO.class));
    }

    @Test
    @DisplayName("Đặt hàng QR thất bại - món không còn phục vụ")
    void placeOrder_menuItemUnavailable() {
        testMenuItem.setAvailable(false);

        QrOrderDTO qrOrder = QrOrderDTO.builder()
                .clientSessionId("sess-test-uuid-002")
                .orderItems(List.of(OrderItemDTO.builder().menuItemId(1L).quantity(1).build()))
                .build();

        when(diningTableRepository.findByQrToken("test-token-123"))
                .thenReturn(Optional.of(activeTable));
        when(menuItemRepository.findById(1L)).thenReturn(Optional.of(testMenuItem));

        assertThatThrownBy(() -> qrOrderService.placeOrder("test-token-123", qrOrder))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không còn phục vụ");
    }
}
