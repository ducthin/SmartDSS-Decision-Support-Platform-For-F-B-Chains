package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.dto.VoucherDTO;
import C2SE._1.Capstone2.service.VoucherService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/vouchers")
@RequiredArgsConstructor
public class VoucherController {

    private final VoucherService voucherService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<VoucherDTO>>> getAllVouchers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(voucherService.getAllVouchers(keyword, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<VoucherDTO>> getVoucherById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(voucherService.getVoucherById(id)));
    }

    @GetMapping("/available")
    public ResponseEntity<ApiResponse<java.util.List<VoucherDTO>>> getAvailablePersonalVouchers(@RequestParam String phone) {
        return ResponseEntity.ok(ApiResponse.success(voucherService.getAvailablePersonalVouchers(phone)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<VoucherDTO>> createVoucher(@Valid @RequestBody VoucherDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(voucherService.createVoucher(dto)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<VoucherDTO>> updateVoucher(@PathVariable Long id, @Valid @RequestBody VoucherDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(voucherService.updateVoucher(id, dto)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteVoucher(@PathVariable Long id) {
        voucherService.deleteVoucher(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
