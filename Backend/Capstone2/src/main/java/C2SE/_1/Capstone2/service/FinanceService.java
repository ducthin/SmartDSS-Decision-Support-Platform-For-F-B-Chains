package C2SE._1.Capstone2.service;

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
import C2SE._1.Capstone2.entity.User;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface FinanceService {

    List<FinanceCategoryDTO> getCategories(boolean activeOnly, FinanceType type);

    FinanceCategoryDTO createCategory(FinanceCategoryUpsertDTO dto);

    FinanceCategoryDTO updateCategory(Long id, FinanceCategoryUpsertDTO dto);

    void deactivateCategory(Long id);

    PageResponse<FinanceTransactionDTO> getTransactions(LocalDate fromDate,
                                                        LocalDate toDate,
                                                        FinanceType type,
                                                        Long categoryId,
                                                        String keyword,
                                                        Pageable pageable);

    FinanceTransactionDTO createTransaction(FinanceTransactionCreateDTO dto);

    FinanceTransactionDTO updateTransaction(Long id, FinanceTransactionCreateDTO dto);

    void deleteTransaction(Long id);

    FinanceSummaryDTO getSummary(LocalDate fromDate, LocalDate toDate);

    void recordAutoIncomeFromPayment(Long orderId, BigDecimal amount, LocalDateTime occurredAt, User createdBy);

    List<GrossProfitPointDTO> getGrossProfitDaily(LocalDate fromDate, LocalDate toDate);

    List<GrossProfitPointDTO> getGrossProfitMonthly(LocalDate fromDate, LocalDate toDate);

    PageResponse<CashClosingDTO> getCashClosings(LocalDate fromDate, LocalDate toDate, Pageable pageable);

    CashClosingDTO previewCashClosing(LocalDate businessDate, BigDecimal openingBalance);

    CashClosingDTO closeCashDay(CashClosingCreateDTO dto);
}
