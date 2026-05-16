package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.InventoryDTO;
import C2SE._1.Capstone2.dto.InventoryItemUpsertDTO;
import C2SE._1.Capstone2.dto.InventoryMarketPriceDTO;
import C2SE._1.Capstone2.dto.InventoryMarketPriceUpdateDTO;
import C2SE._1.Capstone2.dto.InventoryTransactionHistoryDTO;
import C2SE._1.Capstone2.dto.InventoryTransactionDTO;
import C2SE._1.Capstone2.dto.InventoryUnitCostUpdateDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.entity.Ingredient;
import C2SE._1.Capstone2.entity.Inventory;
import C2SE._1.Capstone2.entity.InventoryTransaction;
import C2SE._1.Capstone2.entity.TransactionType;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.InsufficientStockException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.InventoryMapper;
import C2SE._1.Capstone2.repository.IngredientRepository;
import C2SE._1.Capstone2.repository.InventoryRepository;
import C2SE._1.Capstone2.repository.InventoryTransactionRepository;
import C2SE._1.Capstone2.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import C2SE._1.Capstone2.util.TimeUtil;

@Service
@RequiredArgsConstructor
@Transactional
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final IngredientRepository ingredientRepository;
    private final InventoryMapper inventoryMapper;

    @Override
    @Transactional(readOnly = true)
    public List<InventoryDTO> getAllInventory() {
        return inventoryMapper.toDTOList(inventoryRepository.findAll());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<InventoryDTO> getAllInventory(Pageable pageable) {
        Page<Inventory> page = inventoryRepository.findAll(pageable);
        return PageResponse.of(page, inventoryMapper.toDTOList(page.getContent()));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<InventoryDTO> searchInventory(String keyword, Boolean lowStock, Pageable pageable) {
        Page<Inventory> page = inventoryRepository.search(keyword, lowStock, pageable);
        return PageResponse.of(page, inventoryMapper.toDTOList(page.getContent()));
    }

    @Override
    public InventoryDTO addStock(InventoryTransactionDTO dto) {
        Inventory inventory = inventoryRepository.findByIdForUpdate(dto.getInventoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Inventory", "id", dto.getInventoryId()));

        BigDecimal oldQuantity = safeMoney(inventory.getQuantity());
        BigDecimal oldUnitCost = safeMoney(inventory.getUnitCost());
        BigDecimal inputUnitPrice = normalizeMoney(dto.getUnitPrice());

        if (inputUnitPrice != null) {
            BigDecimal newQuantity = oldQuantity.add(dto.getQuantity());
            if (newQuantity.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal blendedCost = oldUnitCost.multiply(oldQuantity)
                .add(inputUnitPrice.multiply(dto.getQuantity()))
                .divide(newQuantity, 2, RoundingMode.HALF_UP);
            inventory.setUnitCost(blendedCost);
            }
        }

        inventory.setQuantity(inventory.getQuantity().add(dto.getQuantity()));
        inventoryRepository.save(inventory);

        BigDecimal txUnitPrice = inputUnitPrice != null ? inputUnitPrice : normalizeMoney(inventory.getUnitCost());

        InventoryTransaction transaction = InventoryTransaction.builder()
                .inventory(inventory)
                .type(TransactionType.ADD)
                .quantity(dto.getQuantity())
            .unitPrice(txUnitPrice)
            .totalAmount(calcTotalAmount(dto.getQuantity(), txUnitPrice))
                .reason(dto.getReason())
                .build();
        inventoryTransactionRepository.save(transaction);

        return inventoryMapper.toDTO(inventory);
    }

    @Override
    public InventoryDTO deductStock(InventoryTransactionDTO dto) {
        Inventory inventory = inventoryRepository.findByIdForUpdate(dto.getInventoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Inventory", "id", dto.getInventoryId()));

        if (inventory.getQuantity().compareTo(dto.getQuantity()) < 0) {
            throw new InsufficientStockException(
                    "Insufficient stock for ingredient: " + inventory.getIngredient().getName()
                    + ". Available: " + inventory.getQuantity()
                    + ", Requested: " + dto.getQuantity());
        }

        inventory.setQuantity(inventory.getQuantity().subtract(dto.getQuantity()));
        inventoryRepository.save(inventory);

        BigDecimal txUnitPrice = normalizeMoney(inventory.getUnitCost());

        InventoryTransaction transaction = InventoryTransaction.builder()
                .inventory(inventory)
                .type(TransactionType.DEDUCT)
                .quantity(dto.getQuantity())
            .unitPrice(txUnitPrice)
            .totalAmount(calcTotalAmount(dto.getQuantity(), txUnitPrice))
                .reason(dto.getReason())
                .build();
        inventoryTransactionRepository.save(transaction);

        return inventoryMapper.toDTO(inventory);
    }

    @Override
    public InventoryDTO createInventoryItem(InventoryItemUpsertDTO dto) {
        String normalizedName = normalizeName(dto.getIngredientName());
        String normalizedUnit = normalizeUnit(dto.getUnit());

        if (ingredientRepository.existsByNameIgnoreCase(normalizedName)) {
            throw new BadRequestException("Nguyên liệu đã tồn tại: " + normalizedName);
        }

        Ingredient ingredient = Ingredient.builder()
                .name(normalizedName)
                .unit(normalizedUnit)
                .build();
        Ingredient savedIngredient = ingredientRepository.save(ingredient);

        Inventory inventory = Inventory.builder()
                .ingredient(savedIngredient)
                .quantity(dto.getQuantity())
                .minimumStock(dto.getMinimumStock())
            .unitCost(normalizeMoney(dto.getUnitCost()))
            .marketUnitPrice(normalizeMoney(dto.getMarketUnitPrice()))
            .marketPriceSource(normalizeSource(dto.getMarketPriceSource()))
            .marketPriceUpdatedAt(dto.getMarketUnitPrice() != null ? TimeUtil.nowVN() : null)
                .build();
        Inventory savedInventory = inventoryRepository.save(inventory);
        return inventoryMapper.toDTO(savedInventory);
    }

    @Override
    public InventoryDTO updateInventoryItem(Long inventoryId, InventoryItemUpsertDTO dto) {
        Inventory inventory = inventoryRepository.findByIdForUpdate(inventoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory", "id", inventoryId));

        Ingredient ingredient = inventory.getIngredient();
        String normalizedName = normalizeName(dto.getIngredientName());
        String normalizedUnit = normalizeUnit(dto.getUnit());

        if (ingredientRepository.existsByNameIgnoreCaseAndIdNot(normalizedName, ingredient.getId())) {
            throw new BadRequestException("Tên nguyên liệu đã được dùng: " + normalizedName);
        }

        ingredient.setName(normalizedName);
        ingredient.setUnit(normalizedUnit);
        ingredientRepository.save(ingredient);

        BigDecimal oldQuantity = inventory.getQuantity();
        BigDecimal newQuantity = dto.getQuantity();
        inventory.setQuantity(newQuantity);
        inventory.setMinimumStock(dto.getMinimumStock());
        if (dto.getUnitCost() != null) {
            inventory.setUnitCost(normalizeMoney(dto.getUnitCost()));
        }
        if (dto.getMarketUnitPrice() != null) {
            inventory.setMarketUnitPrice(normalizeMoney(dto.getMarketUnitPrice()));
            inventory.setMarketPriceSource(normalizeSource(dto.getMarketPriceSource()));
            inventory.setMarketPriceUpdatedAt(TimeUtil.nowVN());
        } else if (dto.getMarketPriceSource() != null && !dto.getMarketPriceSource().isBlank()) {
            inventory.setMarketPriceSource(normalizeSource(dto.getMarketPriceSource()));
            inventory.setMarketPriceUpdatedAt(TimeUtil.nowVN());
        }
        Inventory savedInventory = inventoryRepository.save(inventory);

        saveAdjustmentTransactionIfNeeded(savedInventory, oldQuantity, newQuantity);
        return inventoryMapper.toDTO(savedInventory);
    }

    @Override
    public InventoryDTO updateMarketPrice(Long inventoryId, InventoryMarketPriceUpdateDTO dto) {
        Inventory inventory = inventoryRepository.findByIdForUpdate(inventoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory", "id", inventoryId));

        inventory.setMarketUnitPrice(normalizeMoney(dto.getMarketUnitPrice()));
        inventory.setMarketPriceSource(normalizeSource(dto.getSource()));
        inventory.setMarketPriceUpdatedAt(TimeUtil.nowVN());

        return inventoryMapper.toDTO(inventoryRepository.save(inventory));
    }

    @Override
    public InventoryDTO updateUnitCost(Long inventoryId, InventoryUnitCostUpdateDTO dto) {
        Inventory inventory = inventoryRepository.findByIdForUpdate(inventoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory", "id", inventoryId));

        inventory.setUnitCost(normalizeMoney(dto.getUnitCost()));
        return inventoryMapper.toDTO(inventoryRepository.save(inventory));
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryMarketPriceDTO getMarketPrice(Long inventoryId) {
        Inventory inventory = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory", "id", inventoryId));
        return toMarketPriceDTO(inventory);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<InventoryMarketPriceDTO> getMarketPrices(String keyword, Pageable pageable) {
        Page<Inventory> page = inventoryRepository.search(keyword, null, pageable);
        List<InventoryMarketPriceDTO> items = page.getContent().stream().map(this::toMarketPriceDTO).toList();
        return PageResponse.of(page, items);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<InventoryTransactionHistoryDTO> getInventoryTransactions(Long inventoryId, Pageable pageable) {
        Inventory inventory = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory", "id", inventoryId));
        Page<InventoryTransaction> page = inventoryTransactionRepository
                .findByInventoryIdOrderByCreatedAtDesc(inventory.getId(), pageable);
        List<InventoryTransactionHistoryDTO> items = page.getContent().stream()
                .map(tx -> InventoryTransactionHistoryDTO.builder()
                        .id(tx.getId())
                        .type(tx.getType() == null ? null : tx.getType().name())
                        .quantity(tx.getQuantity())
                    .unitPrice(tx.getUnitPrice())
                    .totalAmount(tx.getTotalAmount())
                        .reason(tx.getReason())
                        .createdAt(tx.getCreatedAt())
                        .build())
                .toList();
        return PageResponse.of(page, items);
    }

    private void saveAdjustmentTransactionIfNeeded(Inventory inventory, BigDecimal oldQuantity, BigDecimal newQuantity) {
        if (oldQuantity == null || newQuantity == null || oldQuantity.compareTo(newQuantity) == 0) {
            return;
        }
        BigDecimal diff = newQuantity.subtract(oldQuantity).abs();
        TransactionType type = newQuantity.compareTo(oldQuantity) > 0 ? TransactionType.ADD : TransactionType.DEDUCT;

        InventoryTransaction tx = InventoryTransaction.builder()
                .inventory(inventory)
                .type(type)
                .quantity(diff)
            .unitPrice(normalizeMoney(inventory.getUnitCost()))
            .totalAmount(calcTotalAmount(diff, normalizeMoney(inventory.getUnitCost())))
                .reason("Manual adjust from " + oldQuantity + " to " + newQuantity)
                .build();
        inventoryTransactionRepository.save(tx);
    }

    private String normalizeName(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeUnit(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeSource(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim();
        return normalized.length() <= 120 ? normalized : normalized.substring(0, 120);
    }

    private BigDecimal normalizeMoney(BigDecimal value) {
        if (value == null) {
            return null;
        }
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Giá tiền phải >= 0");
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal safeMoney(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private BigDecimal calcTotalAmount(BigDecimal quantity, BigDecimal unitPrice) {
        if (quantity == null || unitPrice == null) {
            return null;
        }
        return quantity.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);
    }

    private InventoryMarketPriceDTO toMarketPriceDTO(Inventory inventory) {
        Ingredient ingredient = inventory.getIngredient();
        return InventoryMarketPriceDTO.builder()
                .inventoryId(inventory.getId())
                .ingredientId(ingredient == null ? null : ingredient.getId())
                .ingredientName(ingredient == null ? null : ingredient.getName())
                .unit(ingredient == null ? null : ingredient.getUnit())
                .unitCost(inventory.getUnitCost())
                .marketUnitPrice(inventory.getMarketUnitPrice())
                .marketPriceSource(inventory.getMarketPriceSource())
                .marketPriceUpdatedAt(inventory.getMarketPriceUpdatedAt())
                .build();
    }
}
