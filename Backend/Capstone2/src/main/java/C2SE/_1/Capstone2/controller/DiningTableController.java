package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.DiningTableDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.service.DiningTableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;



@RestController
@RequestMapping("/api/v1/tables")
@RequiredArgsConstructor
public class DiningTableController {

    private final DiningTableService diningTableService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<DiningTableDTO>>> getAllTables(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(diningTableService.getAllTables(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DiningTableDTO>> getTableById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(diningTableService.getTableById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DiningTableDTO>> createTable(@Valid @RequestBody DiningTableDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(diningTableService.createTable(dto)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DiningTableDTO>> updateTable(@PathVariable Long id, @Valid @RequestBody DiningTableDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(diningTableService.updateTable(id, dto)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTable(@PathVariable Long id) {
        diningTableService.deleteTable(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/{id}/regenerate-qr")
    public ResponseEntity<ApiResponse<DiningTableDTO>> regenerateQr(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(diningTableService.regenerateQrToken(id)));
    }
}
