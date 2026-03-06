package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.InventoryDTO;
import C2SE._1.Capstone2.dto.InventoryTransactionDTO;

import java.util.List;

public interface InventoryService {

    List<InventoryDTO> getAllInventory();

    InventoryDTO addStock(InventoryTransactionDTO dto);

    InventoryDTO deductStock(InventoryTransactionDTO dto);
}
