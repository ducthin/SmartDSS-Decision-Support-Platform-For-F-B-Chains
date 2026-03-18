package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.InventoryDTO;
import C2SE._1.Capstone2.dto.InventoryItemUpsertDTO;
import C2SE._1.Capstone2.dto.InventoryTransactionHistoryDTO;
import C2SE._1.Capstone2.dto.InventoryTransactionDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<InventoryDTO>>> getAllInventory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean lowStock) {
        var pageable = PageRequest.of(page, size, Sort.by("ingredient.name").ascending());
        if (keyword != null || lowStock != null) {
            return ResponseEntity.ok(ApiResponse.success(
                    inventoryService.searchInventory(keyword, lowStock, pageable)));
        }
        return ResponseEntity.ok(ApiResponse.success(inventoryService.getAllInventory(pageable)));
    }

    @PostMapping("/add")
    public ResponseEntity<ApiResponse<InventoryDTO>> addStock(@Valid @RequestBody InventoryTransactionDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(inventoryService.addStock(dto)));
    }

    @PostMapping("/deduct")
    public ResponseEntity<ApiResponse<InventoryDTO>> deductStock(@Valid @RequestBody InventoryTransactionDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(inventoryService.deductStock(dto)));
    }

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<InventoryDTO>> createInventoryItem(@Valid @RequestBody InventoryItemUpsertDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(inventoryService.createInventoryItem(dto)));
    }

    @PutMapping("/items/{inventoryId}")
    public ResponseEntity<ApiResponse<InventoryDTO>> updateInventoryItem(
            @PathVariable Long inventoryId,
            @Valid @RequestBody InventoryItemUpsertDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(inventoryService.updateInventoryItem(inventoryId, dto)));
    }

    @GetMapping("/{inventoryId}/transactions")
    public ResponseEntity<ApiResponse<PageResponse<InventoryTransactionHistoryDTO>>> getInventoryTransactions(
            @PathVariable Long inventoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(inventoryService.getInventoryTransactions(inventoryId, pageable)));
    }
}
