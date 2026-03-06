package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.InventoryDTO;
import C2SE._1.Capstone2.dto.InventoryTransactionDTO;
import C2SE._1.Capstone2.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<InventoryDTO>>> getAllInventory() {
        return ResponseEntity.ok(ApiResponse.success(inventoryService.getAllInventory()));
    }

    @PostMapping("/add")
    public ResponseEntity<ApiResponse<InventoryDTO>> addStock(@RequestBody InventoryTransactionDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(inventoryService.addStock(dto)));
    }

    @PostMapping("/deduct")
    public ResponseEntity<ApiResponse<InventoryDTO>> deductStock(@RequestBody InventoryTransactionDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(inventoryService.deductStock(dto)));
    }
}
