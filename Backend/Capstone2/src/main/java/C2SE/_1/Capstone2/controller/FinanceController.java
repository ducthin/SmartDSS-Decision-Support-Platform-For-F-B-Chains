package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.CashClosingCreateDTO;
import C2SE._1.Capstone2.dto.CashClosingDTO;
import C2SE._1.Capstone2.dto.FinanceCategoryDTO;
import C2SE._1.Capstone2.dto.FinanceCategoryUpsertDTO;
import C2SE._1.Capstone2.dto.FinanceSummaryDTO;
import C2SE._1.Capstone2.dto.FinanceTransactionCreateDTO;
import C2SE._1.Capstone2.dto.FinanceTransactionDTO;
import C2SE._1.Capstone2.dto.GrossProfitPointDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.entity.FinanceType;
import C2SE._1.Capstone2.service.FinanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/finance")
@RequiredArgsConstructor
public class FinanceController {

    private final FinanceService financeService;

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<FinanceCategoryDTO>>> getCategories(
            @RequestParam(defaultValue = "true") boolean activeOnly,
            @RequestParam(required = false) FinanceType type) {
        return ResponseEntity.ok(ApiResponse.success(financeService.getCategories(activeOnly, type)));
    }

    @PostMapping("/categories")
    public ResponseEntity<ApiResponse<FinanceCategoryDTO>> createCategory(@Valid @RequestBody FinanceCategoryUpsertDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(financeService.createCategory(dto)));
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<FinanceCategoryDTO>> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody FinanceCategoryUpsertDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(financeService.updateCategory(id, dto)));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivateCategory(@PathVariable Long id) {
        financeService.deactivateCategory(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<PageResponse<FinanceTransactionDTO>>> getTransactions(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) FinanceType type,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Order.desc("occurredAt"), Sort.Order.desc("id")));
        return ResponseEntity.ok(ApiResponse.success(
                financeService.getTransactions(fromDate, toDate, type, categoryId, keyword, pageable)));
    }

    @PostMapping("/transactions")
    public ResponseEntity<ApiResponse<FinanceTransactionDTO>> createTransaction(
            @Valid @RequestBody FinanceTransactionCreateDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(financeService.createTransaction(dto)));
    }

    @PutMapping("/transactions/{id}")
    public ResponseEntity<ApiResponse<FinanceTransactionDTO>> updateTransaction(
            @PathVariable Long id,
            @Valid @RequestBody FinanceTransactionCreateDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(financeService.updateTransaction(id, dto)));
    }

    @DeleteMapping("/transactions/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTransaction(@PathVariable Long id) {
        financeService.deleteTransaction(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<FinanceSummaryDTO>> getSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.success(financeService.getSummary(fromDate, toDate)));
    }

    @GetMapping("/gross-profit/daily")
    public ResponseEntity<ApiResponse<List<GrossProfitPointDTO>>> getGrossProfitDaily(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.success(financeService.getGrossProfitDaily(fromDate, toDate)));
    }

    @GetMapping("/gross-profit/monthly")
    public ResponseEntity<ApiResponse<List<GrossProfitPointDTO>>> getGrossProfitMonthly(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.success(financeService.getGrossProfitMonthly(fromDate, toDate)));
    }

    @GetMapping("/cash-closings")
    public ResponseEntity<ApiResponse<PageResponse<CashClosingDTO>>> getCashClosings(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Order.desc("businessDate"), Sort.Order.desc("id")));
        return ResponseEntity.ok(ApiResponse.success(financeService.getCashClosings(fromDate, toDate, pageable)));
    }

    @GetMapping("/cash-closings/preview")
    public ResponseEntity<ApiResponse<CashClosingDTO>> previewCashClosing(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate,
            @RequestParam(required = false) BigDecimal openingBalance) {
        return ResponseEntity.ok(ApiResponse.success(financeService.previewCashClosing(businessDate, openingBalance)));
    }

    @PostMapping("/cash-closings")
    public ResponseEntity<ApiResponse<CashClosingDTO>> closeCashDay(@Valid @RequestBody CashClosingCreateDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(financeService.closeCashDay(dto)));
    }
}
