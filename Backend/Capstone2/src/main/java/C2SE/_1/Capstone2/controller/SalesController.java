package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.SalesDTO;
import C2SE._1.Capstone2.service.SalesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/sales")
@RequiredArgsConstructor
public class SalesController {

    private final SalesService salesService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SalesDTO>>> getAllSales() {
        return ResponseEntity.ok(ApiResponse.success(salesService.getAllSales()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SalesDTO>> getSaleById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(salesService.getSaleById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SalesDTO>> createSale(@Valid @RequestBody SalesDTO salesDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(salesService.createSale(salesDTO)));
    }
}
