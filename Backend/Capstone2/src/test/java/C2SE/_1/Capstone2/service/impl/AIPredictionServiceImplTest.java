package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.AIPredictionResponseDTO;
import C2SE._1.Capstone2.dto.DailySalesReportDTO;
import C2SE._1.Capstone2.dto.DrinkSizeOptionDTO;
import C2SE._1.Capstone2.dto.OrderToppingLineDTO;
import C2SE._1.Capstone2.entity.Ingredient;
import C2SE._1.Capstone2.entity.Inventory;
import C2SE._1.Capstone2.entity.MenuItem;
import C2SE._1.Capstone2.entity.Order;
import C2SE._1.Capstone2.entity.OrderItem;
import C2SE._1.Capstone2.entity.OrderStatus;
import C2SE._1.Capstone2.entity.Recipe;
import C2SE._1.Capstone2.repository.HolidayCalendarRepository;
import C2SE._1.Capstone2.repository.InventoryRepository;
import C2SE._1.Capstone2.repository.MenuItemRepository;
import C2SE._1.Capstone2.repository.OrderItemRepository;
import C2SE._1.Capstone2.repository.RecipeRepository;
import C2SE._1.Capstone2.service.AreaBusynessService;
import C2SE._1.Capstone2.service.EventService;
import C2SE._1.Capstone2.service.OpenAiComparisonService;
import C2SE._1.Capstone2.service.ReportService;
import C2SE._1.Capstone2.service.WeatherService;
import C2SE._1.Capstone2.util.DrinkOptionsJsonMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AIPredictionServiceImplTest {

    @Mock private WeatherService weatherService;
    @Mock private AreaBusynessService areaBusynessService;
    @Mock private EventService eventService;
    @Mock private ReportService reportService;
    @Mock private InventoryRepository inventoryRepository;
    @Mock private MenuItemRepository menuItemRepository;
    @Mock private OrderItemRepository orderItemRepository;
    @Mock private RecipeRepository recipeRepository;
    @Mock private HolidayCalendarRepository holidayCalendarRepository;
    @Mock private DrinkOptionsJsonMapper drinkOptionsJsonMapper;
    @Mock private RestTemplate mlServiceRestTemplate;
    @Mock private OpenAiComparisonService openAiComparisonService;

    @InjectMocks
    private AIPredictionServiceImpl aiPredictionService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(aiPredictionService, "appTimezone", "Asia/Ho_Chi_Minh");
    }

    @Test
    @DisplayName("Same-day enrichment uses operational completed-order revenue")
    void applyIntraDayEnrichmentUsesOperationalSales() {
        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate today = LocalDate.now(zone);
        ZonedDateTime now = today.atTime(14, 0).atZone(zone);

        DailySalesReportDTO operational = DailySalesReportDTO.builder()
                .date(today.toString())
                .totalOrders(6L)
                .totalRevenue(BigDecimal.valueOf(720_000))
                .build();

        AIPredictionResponseDTO result = AIPredictionResponseDTO.builder()
                .predictedRevenue(1_800_000.0)
                .predictedOrders(20)
                .confidenceScore(0.70)
                .message("ML baseline")
                .build();

        when(reportService.getDailyOperationalSalesReport(today)).thenReturn(List.of(operational));

        String llmContext = ReflectionTestUtils.invokeMethod(
                aiPredictionService,
                "applyIntraDayEnrichment",
                today,
                false,
                today,
                now,
                result
        );

        assertThat(result.getActualRevenueSoFar()).isEqualTo(720_000.0);
        assertThat(result.getActualOrdersSoFar()).isEqualTo(6L);
        assertThat(result.getPredictionKind()).isEqualTo("eod_adjusted");
        assertThat(result.getPredictedRevenue()).isGreaterThanOrEqualTo(720_000.0);
        assertThat(result.getMessage()).contains("van hanh");
        assertThat(llmContext).contains("van hanh");
        verify(reportService).getDailyOperationalSalesReport(today);
    }

    @Test
    @DisplayName("Inventory suggestion uses recipe mix from recent completed orders")
    void inventorySuggestionUsesRecipeBasedUsageFromRecentOrders() {
        Ingredient coffee = Ingredient.builder().id(1L).name("Ca phe xay").unit("g").build();
        Ingredient milk = Ingredient.builder().id(2L).name("Sua tuoi").unit("ml").build();
        Ingredient boba = Ingredient.builder().id(3L).name("Tran chau").unit("g").build();

        Inventory coffeeInventory = Inventory.builder().ingredient(coffee).quantity(BigDecimal.valueOf(100)).build();
        Inventory milkInventory = Inventory.builder().ingredient(milk).quantity(BigDecimal.valueOf(100)).build();
        Inventory bobaInventory = Inventory.builder().ingredient(boba).quantity(BigDecimal.valueOf(10)).build();

        MenuItem latte = MenuItem.builder()
                .id(11L)
                .name("Latte")
                .drink(true)
                .drinkSizesJson("sizes-json")
                .build();

        Order completedOrder = Order.builder()
                .id(21L)
                .status(OrderStatus.COMPLETED)
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();

        OrderItem orderItem = OrderItem.builder()
                .id(31L)
                .order(completedOrder)
                .menuItem(latte)
                .quantity(2)
                .selectedSizeCode("L")
                .selectedToppingsJson("toppings-json")
                .build();

        Recipe coffeeRecipe = Recipe.builder().menuItem(latte).ingredient(coffee).quantity(BigDecimal.TEN).build();
        Recipe milkRecipe = Recipe.builder().menuItem(latte).ingredient(milk).quantity(BigDecimal.valueOf(100)).build();

        when(inventoryRepository.findAllWithIngredient()).thenReturn(List.of(coffeeInventory, milkInventory, bobaInventory));
        when(orderItemRepository.findRecentByOrderStatusAndCreatedAtBetween(
                eq(OrderStatus.COMPLETED),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class)
        )).thenReturn(List.of(orderItem));
        when(menuItemRepository.findByNameIn(anyCollection())).thenReturn(List.of());
        when(recipeRepository.findByMenuItemIdIn(anySet())).thenReturn(List.of(coffeeRecipe, milkRecipe));
        when(drinkOptionsJsonMapper.parseSizes("sizes-json")).thenReturn(List.of(
                DrinkSizeOptionDTO.builder().code("S").label("S").priceExtra(BigDecimal.ZERO).build(),
                DrinkSizeOptionDTO.builder().code("M").label("M").priceExtra(BigDecimal.valueOf(8_000)).build(),
                DrinkSizeOptionDTO.builder().code("L").label("L").priceExtra(BigDecimal.valueOf(18_000)).build()
        ));
        when(drinkOptionsJsonMapper.toppingSnapshotJsonToList("toppings-json")).thenReturn(List.of(
                OrderToppingLineDTO.builder().code("TRAN_CHAU").label("Tran chau").price(BigDecimal.valueOf(7_000)).build()
        ));

        boolean[] evaluated = {false};
        @SuppressWarnings("unchecked")
        Map<String, Double> shortfalls = (Map<String, Double>) ReflectionTestUtils.invokeMethod(
                aiPredictionService,
                "calculateInventoryShortfalls",
                10,
                evaluated
        );

        assertThat(evaluated[0]).isTrue();
        assertThat(shortfalls).containsEntry("Ca phe xay (g)", 50.0);
        assertThat(shortfalls).containsEntry("Sua tuoi (ml)", 1400.0);
        assertThat(shortfalls).containsEntry("Tran chau (g)", 290.0);

        AIPredictionResponseDTO result = AIPredictionResponseDTO.builder()
                .predictedOrders(10)
                .message("ML baseline")
                .build();
        ReflectionTestUtils.invokeMethod(aiPredictionService, "attachInventorySuggestionSafely", result);
        assertThat(result.getPredictedInventoryOverview()).hasSize(3);
        assertThat(result.getPredictedInventoryOverview())
                .extracting("ingredientName")
                .containsExactly("Sua tuoi", "Tran chau", "Ca phe xay");
    }
}
