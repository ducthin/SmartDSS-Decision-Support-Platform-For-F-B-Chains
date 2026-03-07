package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.InventoryDTO;
import C2SE._1.Capstone2.dto.InventoryTransactionDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface InventoryService {

    List<InventoryDTO> getAllInventory();

    PageResponse<InventoryDTO> getAllInventory(Pageable pageable);

    PageResponse<InventoryDTO> searchInventory(String keyword, Boolean lowStock, Pageable pageable);

    InventoryDTO addStock(InventoryTransactionDTO dto);

    InventoryDTO deductStock(InventoryTransactionDTO dto);
}
