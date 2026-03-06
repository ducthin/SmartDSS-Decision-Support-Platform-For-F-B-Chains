package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.InventoryDTO;
import C2SE._1.Capstone2.dto.InventoryTransactionDTO;
import C2SE._1.Capstone2.entity.Inventory;
import C2SE._1.Capstone2.entity.InventoryTransaction;
import C2SE._1.Capstone2.entity.TransactionType;
import C2SE._1.Capstone2.exception.InsufficientStockException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.InventoryMapper;
import C2SE._1.Capstone2.repository.InventoryRepository;
import C2SE._1.Capstone2.repository.InventoryTransactionRepository;
import C2SE._1.Capstone2.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final InventoryMapper inventoryMapper;

    @Override
    @Transactional(readOnly = true)
    public List<InventoryDTO> getAllInventory() {
        return inventoryMapper.toDTOList(inventoryRepository.findAll());
    }

    @Override
    public InventoryDTO addStock(InventoryTransactionDTO dto) {
        Inventory inventory = inventoryRepository.findById(dto.getInventoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Inventory", "id", dto.getInventoryId()));

        inventory.setQuantity(inventory.getQuantity().add(dto.getQuantity()));
        inventoryRepository.save(inventory);

        InventoryTransaction transaction = InventoryTransaction.builder()
                .inventory(inventory)
                .type(TransactionType.ADD)
                .quantity(dto.getQuantity())
                .reason(dto.getReason())
                .build();
        inventoryTransactionRepository.save(transaction);

        return inventoryMapper.toDTO(inventory);
    }

    @Override
    public InventoryDTO deductStock(InventoryTransactionDTO dto) {
        Inventory inventory = inventoryRepository.findById(dto.getInventoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Inventory", "id", dto.getInventoryId()));

        if (inventory.getQuantity().compareTo(dto.getQuantity()) < 0) {
            throw new InsufficientStockException(
                    "Insufficient stock for ingredient: " + inventory.getIngredient().getName()
                    + ". Available: " + inventory.getQuantity()
                    + ", Requested: " + dto.getQuantity());
        }

        inventory.setQuantity(inventory.getQuantity().subtract(dto.getQuantity()));
        inventoryRepository.save(inventory);

        InventoryTransaction transaction = InventoryTransaction.builder()
                .inventory(inventory)
                .type(TransactionType.DEDUCT)
                .quantity(dto.getQuantity())
                .reason(dto.getReason())
                .build();
        inventoryTransactionRepository.save(transaction);

        return inventoryMapper.toDTO(inventory);
    }
}
