package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.InventoryDTO;
import C2SE._1.Capstone2.dto.InventoryTransactionDTO;
import C2SE._1.Capstone2.entity.Ingredient;
import C2SE._1.Capstone2.entity.Inventory;
import C2SE._1.Capstone2.entity.InventoryTransaction;
import C2SE._1.Capstone2.exception.InsufficientStockException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.InventoryMapper;
import C2SE._1.Capstone2.repository.InventoryRepository;
import C2SE._1.Capstone2.repository.InventoryTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryServiceImplTest {

    @Mock private InventoryRepository inventoryRepository;
    @Mock private InventoryTransactionRepository inventoryTransactionRepository;
    @Mock private InventoryMapper inventoryMapper;

    @InjectMocks
    private InventoryServiceImpl inventoryService;

    private Inventory testInventory;
    private Ingredient testIngredient;

    @BeforeEach
    void setUp() {
        testIngredient = Ingredient.builder().id(1L).name("Cà phê xay").unit("g").build();
        testInventory = Inventory.builder()
                .id(1L).ingredient(testIngredient)
                .quantity(BigDecimal.valueOf(5000))
                .minimumStock(BigDecimal.valueOf(500))
                .build();
    }

    @Test
    @DisplayName("Nhập kho thành công")
    void addStock_success() {
        InventoryTransactionDTO dto = InventoryTransactionDTO.builder()
                .inventoryId(1L).quantity(BigDecimal.valueOf(1000)).reason("Nhập hàng").build();

        when(inventoryRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(testInventory));
        when(inventoryRepository.save(any())).thenReturn(testInventory);
        when(inventoryMapper.toDTO(any())).thenReturn(
                InventoryDTO.builder().id(1L).quantity(BigDecimal.valueOf(6000)).build());

        InventoryDTO result = inventoryService.addStock(dto);

        assertThat(result).isNotNull();
        assertThat(testInventory.getQuantity()).isEqualByComparingTo(BigDecimal.valueOf(6000));
        verify(inventoryTransactionRepository).save(any(InventoryTransaction.class));
    }

    @Test
    @DisplayName("Xuất kho thành công")
    void deductStock_success() {
        InventoryTransactionDTO dto = InventoryTransactionDTO.builder()
                .inventoryId(1L).quantity(BigDecimal.valueOf(1000)).reason("Sử dụng").build();

        when(inventoryRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(testInventory));
        when(inventoryRepository.save(any())).thenReturn(testInventory);
        when(inventoryMapper.toDTO(any())).thenReturn(
                InventoryDTO.builder().id(1L).quantity(BigDecimal.valueOf(4000)).build());

        InventoryDTO result = inventoryService.deductStock(dto);

        assertThat(result).isNotNull();
        assertThat(testInventory.getQuantity()).isEqualByComparingTo(BigDecimal.valueOf(4000));
        verify(inventoryTransactionRepository).save(any(InventoryTransaction.class));
    }

    @Test
    @DisplayName("Xuất kho thất bại - không đủ hàng")
    void deductStock_insufficientStock() {
        InventoryTransactionDTO dto = InventoryTransactionDTO.builder()
                .inventoryId(1L).quantity(BigDecimal.valueOf(9000)).reason("Sử dụng").build();

        when(inventoryRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(testInventory));

        assertThatThrownBy(() -> inventoryService.deductStock(dto))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("Insufficient stock");
    }

    @Test
    @DisplayName("Nhập kho thất bại - inventory không tồn tại")
    void addStock_inventoryNotFound() {
        InventoryTransactionDTO dto = InventoryTransactionDTO.builder()
                .inventoryId(999L).quantity(BigDecimal.valueOf(100)).build();

        when(inventoryRepository.findByIdForUpdate(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inventoryService.addStock(dto))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
