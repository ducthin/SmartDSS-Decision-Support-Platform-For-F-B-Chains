package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.CashClosingCreateDTO;
import C2SE._1.Capstone2.dto.CashClosingDTO;
import C2SE._1.Capstone2.dto.FinanceCategoryDTO;
import C2SE._1.Capstone2.dto.FinanceCategoryUpsertDTO;
import C2SE._1.Capstone2.dto.FinanceSummaryDTO;
import C2SE._1.Capstone2.dto.FinanceTransactionCreateDTO;
import C2SE._1.Capstone2.dto.FinanceTransactionDTO;
import C2SE._1.Capstone2.dto.GrossProfitPointDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.entity.CashClosing;
import C2SE._1.Capstone2.entity.FinanceCategory;
import C2SE._1.Capstone2.entity.FinanceTransaction;
import C2SE._1.Capstone2.entity.FinanceType;
import C2SE._1.Capstone2.entity.InventoryTransaction;
import C2SE._1.Capstone2.entity.SalesTransaction;
import C2SE._1.Capstone2.entity.TransactionType;
import C2SE._1.Capstone2.entity.User;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.repository.CashClosingRepository;
import C2SE._1.Capstone2.repository.FinanceCategoryRepository;
import C2SE._1.Capstone2.repository.FinanceTransactionRepository;
import C2SE._1.Capstone2.repository.InventoryTransactionRepository;
import C2SE._1.Capstone2.repository.SalesTransactionRepository;
import C2SE._1.Capstone2.repository.UserRepository;
import C2SE._1.Capstone2.service.FinanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import C2SE._1.Capstone2.util.TimeUtil;

@Service
@RequiredArgsConstructor
@Transactional
public class FinanceServiceImpl implements FinanceService {

    private static final String AUTO_INCOME_SOURCE_TYPE = "AUTO_PAYMENT_PAID";
    private static final String AUTO_INCOME_CATEGORY_NAME = "Doanh thu bán hàng (Tự động)";

    private final FinanceCategoryRepository financeCategoryRepository;
    private final FinanceTransactionRepository financeTransactionRepository;
    private final CashClosingRepository cashClosingRepository;
    private final SalesTransactionRepository salesTransactionRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<FinanceCategoryDTO> getCategories(boolean activeOnly, FinanceType type) {
        return financeCategoryRepository.findForSelection(activeOnly, type)
                .stream()
                .map(this::toCategoryDTO)
                .toList();
    }

    @Override
    public FinanceCategoryDTO createCategory(FinanceCategoryUpsertDTO dto) {
        String normalizedName = normalizeName(dto.getName());
        if (financeCategoryRepository.existsByNameIgnoreCase(normalizedName)) {
            throw new BadRequestException("Danh mục đã tồn tại: " + normalizedName);
        }

        FinanceCategory category = FinanceCategory.builder()
                .name(normalizedName)
                .type(dto.getType())
                .active(dto.getActive() == null ? Boolean.TRUE : dto.getActive())
                .build();
        return toCategoryDTO(financeCategoryRepository.save(category));
    }

    @Override
    public FinanceCategoryDTO updateCategory(Long id, FinanceCategoryUpsertDTO dto) {
        FinanceCategory category = financeCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FinanceCategory", "id", id));

        String normalizedName = normalizeName(dto.getName());
        if (financeCategoryRepository.existsByNameIgnoreCaseAndIdNot(normalizedName, id)) {
            throw new BadRequestException("Danh mục đã tồn tại: " + normalizedName);
        }

        category.setName(normalizedName);
        category.setType(dto.getType());
        if (dto.getActive() != null) {
            category.setActive(dto.getActive());
        }
        return toCategoryDTO(financeCategoryRepository.save(category));
    }

    @Override
    public void deactivateCategory(Long id) {
        FinanceCategory category = financeCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FinanceCategory", "id", id));
        category.setActive(false);
        financeCategoryRepository.save(category);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<FinanceTransactionDTO> getTransactions(LocalDate fromDate,
                                                               LocalDate toDate,
                                                               FinanceType type,
                                                               Long categoryId,
                                                               String keyword,
                                                               Pageable pageable) {
        DateRange range = resolveDateRange(fromDate, toDate);
        Page<FinanceTransaction> page = financeTransactionRepository.search(
                range.fromDateTime(),
                range.toDateTime(),
                type,
                categoryId,
                normalizeKeyword(keyword),
                pageable
        );

        List<FinanceTransactionDTO> items = page.getContent().stream()
                .map(this::toTransactionDTO)
                .toList();
        return PageResponse.of(page, items);
    }

    @Override
    public FinanceTransactionDTO createTransaction(FinanceTransactionCreateDTO dto) {
        FinanceCategory category = resolveActiveCategory(dto.getCategoryId());
        FinanceTransaction transaction = FinanceTransaction.builder()
                .category(category)
                .type(category.getType())
                .amount(normalizeMoney(dto.getAmount()))
                .occurredAt(dto.getOccurredAt() == null ? TimeUtil.nowVN() : dto.getOccurredAt())
                .note(normalizeNote(dto.getNote()))
                .sourceType(normalizeSource(dto.getSourceType(), 30))
                .sourceRefId(normalizeSource(dto.getSourceRefId(), 60))
                .createdBy(resolveCurrentUser())
                .build();

        return toTransactionDTO(financeTransactionRepository.save(transaction));
    }

    @Override
    public FinanceTransactionDTO updateTransaction(Long id, FinanceTransactionCreateDTO dto) {
        FinanceTransaction transaction = financeTransactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FinanceTransaction", "id", id));
        FinanceCategory category = resolveActiveCategory(dto.getCategoryId());

        transaction.setCategory(category);
        transaction.setType(category.getType());
        transaction.setAmount(normalizeMoney(dto.getAmount()));
        transaction.setOccurredAt(dto.getOccurredAt() == null ? TimeUtil.nowVN() : dto.getOccurredAt());
        transaction.setNote(normalizeNote(dto.getNote()));
        transaction.setSourceType(normalizeSource(dto.getSourceType(), 30));
        transaction.setSourceRefId(normalizeSource(dto.getSourceRefId(), 60));

        return toTransactionDTO(financeTransactionRepository.save(transaction));
    }

    @Override
    public void deleteTransaction(Long id) {
        if (!financeTransactionRepository.existsById(id)) {
            throw new ResourceNotFoundException("FinanceTransaction", "id", id);
        }
        financeTransactionRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public FinanceSummaryDTO getSummary(LocalDate fromDate, LocalDate toDate) {
        DateRange range = resolveDateRange(fromDate, toDate);
        List<FinanceTransaction> items = financeTransactionRepository.findByOccurredAtRange(
                range.fromDateTime(),
                range.toDateTime());

        BigDecimal totalIncome = items.stream()
                .filter(item -> item.getType() == FinanceType.INCOME)
                .map(item -> safeMoney(item.getAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalExpense = items.stream()
                .filter(item -> item.getType() == FinanceType.EXPENSE)
                .map(item -> safeMoney(item.getAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal netCashflow = totalIncome.subtract(totalExpense).setScale(2, RoundingMode.HALF_UP);

        return FinanceSummaryDTO.builder()
                .fromDate(range.fromDate())
                .toDate(range.toDate())
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .netCashflow(netCashflow)
                .totalTransactions((long) items.size())
                .build();
    }

    @Override
    public void recordAutoIncomeFromPayment(Long orderId, BigDecimal amount, LocalDateTime occurredAt, User createdBy) {
        if (orderId == null) {
            return;
        }
        BigDecimal normalizedAmount = normalizeScale(amount);
        if (normalizedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        String sourceRefId = String.valueOf(orderId);
        if (financeTransactionRepository.existsBySourceTypeAndSourceRefId(AUTO_INCOME_SOURCE_TYPE, sourceRefId)) {
            return;
        }

        FinanceCategory category = resolveAutoIncomeCategory();
        FinanceTransaction autoIncome = FinanceTransaction.builder()
                .category(category)
                .type(FinanceType.INCOME)
                .amount(normalizedAmount)
                .occurredAt(occurredAt == null ? TimeUtil.nowVN() : occurredAt)
                .note("Tự động ghi nhận thu từ thanh toán đơn #" + orderId)
                .sourceType(AUTO_INCOME_SOURCE_TYPE)
                .sourceRefId(sourceRefId)
                .createdBy(createdBy)
                .build();

        financeTransactionRepository.save(autoIncome);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GrossProfitPointDTO> getGrossProfitDaily(LocalDate fromDate, LocalDate toDate) {
        DateRange range = resolveDateRange(fromDate, toDate);

        Map<LocalDate, BigDecimal> revenueByDate = buildRevenueByDate(range.fromDateTime(), range.toDateTime());
        Map<LocalDate, BigDecimal> cogsByDate = buildCogsByDate(range.fromDateTime(), range.toDateTime());

        List<GrossProfitPointDTO> result = new java.util.ArrayList<>();
        for (LocalDate date = range.fromDate(); !date.isAfter(range.toDate()); date = date.plusDays(1)) {
            BigDecimal revenue = safeMoney(revenueByDate.get(date));
            BigDecimal cogs = safeMoney(cogsByDate.get(date));
            result.add(GrossProfitPointDTO.builder()
                    .period(date.toString())
                    .revenue(revenue)
                    .cogs(cogs)
                    .grossProfit(normalizeScale(revenue.subtract(cogs)))
                    .build());
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<GrossProfitPointDTO> getGrossProfitMonthly(LocalDate fromDate, LocalDate toDate) {
        DateRange range = resolveDateRange(fromDate, toDate);

        Map<LocalDate, BigDecimal> revenueByDate = buildRevenueByDate(range.fromDateTime(), range.toDateTime());
        Map<LocalDate, BigDecimal> cogsByDate = buildCogsByDate(range.fromDateTime(), range.toDateTime());

        Map<YearMonth, BigDecimal> revenueByMonth = new HashMap<>();
        for (Map.Entry<LocalDate, BigDecimal> entry : revenueByDate.entrySet()) {
            revenueByMonth.merge(YearMonth.from(entry.getKey()), safeMoney(entry.getValue()), BigDecimal::add);
        }

        Map<YearMonth, BigDecimal> cogsByMonth = new HashMap<>();
        for (Map.Entry<LocalDate, BigDecimal> entry : cogsByDate.entrySet()) {
            cogsByMonth.merge(YearMonth.from(entry.getKey()), safeMoney(entry.getValue()), BigDecimal::add);
        }

        List<GrossProfitPointDTO> result = new java.util.ArrayList<>();
        YearMonth from = YearMonth.from(range.fromDate());
        YearMonth to = YearMonth.from(range.toDate());
        for (YearMonth month = from; !month.isAfter(to); month = month.plusMonths(1)) {
            BigDecimal revenue = safeMoney(revenueByMonth.get(month));
            BigDecimal cogs = safeMoney(cogsByMonth.get(month));
            result.add(GrossProfitPointDTO.builder()
                    .period(month.toString())
                    .revenue(revenue)
                    .cogs(cogs)
                    .grossProfit(normalizeScale(revenue.subtract(cogs)))
                    .build());
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CashClosingDTO> getCashClosings(LocalDate fromDate, LocalDate toDate, Pageable pageable) {
        DateRange range = resolveDateRange(fromDate, toDate);
        Page<CashClosing> page = cashClosingRepository.findByBusinessDateBetweenOrderByBusinessDateDesc(
                range.fromDate(),
                range.toDate(),
                pageable
        );
        List<CashClosingDTO> items = page.getContent().stream()
                .map(this::toCashClosingDTO)
                .toList();
        return PageResponse.of(page, items);
    }

    @Override
    @Transactional(readOnly = true)
    public CashClosingDTO previewCashClosing(LocalDate businessDate, BigDecimal openingBalance) {
        LocalDate targetDate = businessDate == null ? TimeUtil.todayVN() : businessDate;
        CashClosing existing = cashClosingRepository.findByBusinessDate(targetDate).orElse(null);

        BigDecimal resolvedOpeningBalance = openingBalance != null
                ? normalizeNonNegativeMoney(openingBalance, "Tồn đầu phải >= 0")
                : existing != null
                    ? safeMoney(existing.getOpeningBalance())
                    : resolveOpeningBalanceFromPreviousClosing(targetDate);

        DailyFlow dailyFlow = calculateDailyFlow(targetDate);
        BigDecimal expectedBalance = normalizeScale(resolvedOpeningBalance
                .add(dailyFlow.totalInflow())
                .subtract(dailyFlow.totalOutflow()));

        BigDecimal actualBalance = existing == null ? null : safeMoney(existing.getActualBalance());
        BigDecimal variance = actualBalance == null ? null : normalizeScale(actualBalance.subtract(expectedBalance));

        return CashClosingDTO.builder()
                .id(existing == null ? null : existing.getId())
                .businessDate(targetDate)
                .openingBalance(resolvedOpeningBalance)
                .totalInflow(dailyFlow.totalInflow())
                .totalOutflow(dailyFlow.totalOutflow())
                .expectedBalance(expectedBalance)
                .actualBalance(actualBalance)
                .variance(variance)
                .note(existing == null ? null : existing.getNote())
                .closedById(existing != null && existing.getClosedBy() != null ? existing.getClosedBy().getId() : null)
                .closedByName(existing != null && existing.getClosedBy() != null ? existing.getClosedBy().getFullName() : null)
                .closedAt(existing == null ? null : existing.getClosedAt())
                .createdAt(existing == null ? null : existing.getCreatedAt())
                .updatedAt(existing == null ? null : existing.getUpdatedAt())
                .build();
    }

    @Override
    public CashClosingDTO closeCashDay(CashClosingCreateDTO dto) {
        LocalDate targetDate = dto.getBusinessDate() == null ? TimeUtil.todayVN() : dto.getBusinessDate();
        CashClosing existing = cashClosingRepository.findByBusinessDate(targetDate).orElse(null);

        BigDecimal openingBalance = dto.getOpeningBalance() != null
                ? normalizeNonNegativeMoney(dto.getOpeningBalance(), "Tồn đầu phải >= 0")
                : existing != null
                    ? safeMoney(existing.getOpeningBalance())
                    : resolveOpeningBalanceFromPreviousClosing(targetDate);

        DailyFlow dailyFlow = calculateDailyFlow(targetDate);
        BigDecimal expectedBalance = normalizeScale(openingBalance
                .add(dailyFlow.totalInflow())
                .subtract(dailyFlow.totalOutflow()));
        BigDecimal actualBalance = normalizeNonNegativeMoney(dto.getActualBalance(), "Tồn thực tế phải >= 0");
        BigDecimal variance = normalizeScale(actualBalance.subtract(expectedBalance));

        CashClosing closing = existing == null
                ? CashClosing.builder().businessDate(targetDate).build()
                : existing;

        closing.setOpeningBalance(openingBalance);
        closing.setTotalInflow(dailyFlow.totalInflow());
        closing.setTotalOutflow(dailyFlow.totalOutflow());
        closing.setExpectedBalance(expectedBalance);
        closing.setActualBalance(actualBalance);
        closing.setVariance(variance);
        closing.setNote(normalizeNote(dto.getNote()));
        closing.setClosedBy(resolveCurrentUser());
        closing.setClosedAt(TimeUtil.nowVN());

        return toCashClosingDTO(cashClosingRepository.save(closing));
    }

    private Map<LocalDate, BigDecimal> buildRevenueByDate(LocalDateTime fromDateTime, LocalDateTime toDateTime) {
        Map<LocalDate, BigDecimal> revenueByDate = new HashMap<>();
        List<SalesTransaction> paidTransactions = salesTransactionRepository.findPaidTransactionsInRange(fromDateTime, toDateTime);
        for (SalesTransaction transaction : paidTransactions) {
            LocalDateTime paidTime = resolvePaidTime(transaction);
            if (paidTime == null || paidTime.isBefore(fromDateTime) || paidTime.isAfter(toDateTime)) {
                continue;
            }
            revenueByDate.merge(paidTime.toLocalDate(), safeMoney(transaction.getTotalAmount()), BigDecimal::add);
        }
        return revenueByDate;
    }

    private Map<LocalDate, BigDecimal> buildCogsByDate(LocalDateTime fromDateTime, LocalDateTime toDateTime) {
        Map<LocalDate, BigDecimal> cogsByDate = new HashMap<>();
        List<InventoryTransaction> deductions = inventoryTransactionRepository.findByTypeAndCreatedAtBetween(
                TransactionType.DEDUCT,
                fromDateTime,
                toDateTime
        );

        for (InventoryTransaction transaction : deductions) {
            if (transaction.getCreatedAt() == null) {
                continue;
            }
            LocalDate date = transaction.getCreatedAt().toLocalDate();
            cogsByDate.merge(date, resolveInventoryAmount(transaction), BigDecimal::add);
        }
        return cogsByDate;
    }

    private DailyFlow calculateDailyFlow(LocalDate targetDate) {
        LocalDateTime start = targetDate.atStartOfDay();
        LocalDateTime end = targetDate.atTime(LocalTime.MAX);
        List<FinanceTransaction> items = financeTransactionRepository.findByOccurredAtRange(start, end);

        BigDecimal inflow = items.stream()
                .filter(item -> item.getType() == FinanceType.INCOME)
                .map(item -> safeMoney(item.getAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal outflow = items.stream()
                .filter(item -> item.getType() == FinanceType.EXPENSE)
                .map(item -> safeMoney(item.getAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new DailyFlow(normalizeScale(inflow), normalizeScale(outflow));
    }

    private BigDecimal resolveOpeningBalanceFromPreviousClosing(LocalDate targetDate) {
        return cashClosingRepository.findTopByBusinessDateLessThanOrderByBusinessDateDesc(targetDate)
                .map(item -> safeMoney(item.getActualBalance()))
                .orElse(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
    }

    private FinanceCategory resolveAutoIncomeCategory() {
        FinanceCategory byName = financeCategoryRepository.findByNameIgnoreCase(AUTO_INCOME_CATEGORY_NAME).orElse(null);
        if (byName != null) {
            boolean changed = false;
            if (byName.getType() != FinanceType.INCOME) {
                byName.setType(FinanceType.INCOME);
                changed = true;
            }
            if (!Boolean.TRUE.equals(byName.getActive())) {
                byName.setActive(true);
                changed = true;
            }
            return changed ? financeCategoryRepository.save(byName) : byName;
        }

        FinanceCategory firstIncome = financeCategoryRepository.findFirstByTypeAndActiveTrueOrderByIdAsc(FinanceType.INCOME)
                .orElse(null);
        if (firstIncome != null) {
            return firstIncome;
        }

        FinanceCategory created = FinanceCategory.builder()
                .name(AUTO_INCOME_CATEGORY_NAME)
                .type(FinanceType.INCOME)
                .active(true)
                .build();
        return financeCategoryRepository.save(created);
    }

    private FinanceCategory resolveActiveCategory(Long categoryId) {
        return financeCategoryRepository.findByIdAndActiveTrue(categoryId)
                .orElseThrow(() -> new BadRequestException("Danh mục thu/chi không tồn tại hoặc đã ngưng hoạt động"));
    }

    private User resolveCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || "anonymousUser".equals(auth.getName())) {
            return null;
        }
        return userRepository.findByUsername(auth.getName()).orElse(null);
    }

    private FinanceCategoryDTO toCategoryDTO(FinanceCategory category) {
        return FinanceCategoryDTO.builder()
                .id(category.getId())
                .name(category.getName())
                .type(category.getType())
                .active(category.getActive())
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }

    private FinanceTransactionDTO toTransactionDTO(FinanceTransaction transaction) {
        User createdBy = transaction.getCreatedBy();
        FinanceCategory category = transaction.getCategory();
        return FinanceTransactionDTO.builder()
                .id(transaction.getId())
                .categoryId(category == null ? null : category.getId())
                .categoryName(category == null ? null : category.getName())
                .type(transaction.getType())
                .amount(transaction.getAmount())
                .occurredAt(transaction.getOccurredAt())
                .note(transaction.getNote())
                .sourceType(transaction.getSourceType())
                .sourceRefId(transaction.getSourceRefId())
                .createdById(createdBy == null ? null : createdBy.getId())
                .createdByName(createdBy == null ? null : createdBy.getFullName())
                .createdAt(transaction.getCreatedAt())
                .updatedAt(transaction.getUpdatedAt())
                .build();
    }

    private CashClosingDTO toCashClosingDTO(CashClosing cashClosing) {
        User closedBy = cashClosing.getClosedBy();
        return CashClosingDTO.builder()
                .id(cashClosing.getId())
                .businessDate(cashClosing.getBusinessDate())
                .openingBalance(cashClosing.getOpeningBalance())
                .totalInflow(cashClosing.getTotalInflow())
                .totalOutflow(cashClosing.getTotalOutflow())
                .expectedBalance(cashClosing.getExpectedBalance())
                .actualBalance(cashClosing.getActualBalance())
                .variance(cashClosing.getVariance())
                .note(cashClosing.getNote())
                .closedById(closedBy == null ? null : closedBy.getId())
                .closedByName(closedBy == null ? null : closedBy.getFullName())
                .closedAt(cashClosing.getClosedAt())
                .createdAt(cashClosing.getCreatedAt())
                .updatedAt(cashClosing.getUpdatedAt())
                .build();
    }

    private LocalDateTime resolvePaidTime(SalesTransaction transaction) {
        if (transaction == null) {
            return null;
        }
        if (transaction.getPaidAt() != null) {
            return transaction.getPaidAt();
        }
        if (transaction.getUpdatedAt() != null) {
            return transaction.getUpdatedAt();
        }
        return transaction.getCreatedAt();
    }

    private BigDecimal resolveInventoryAmount(InventoryTransaction transaction) {
        if (transaction.getTotalAmount() != null) {
            return safeMoney(transaction.getTotalAmount());
        }
        if (transaction.getUnitPrice() != null && transaction.getQuantity() != null) {
            return normalizeScale(transaction.getUnitPrice().multiply(transaction.getQuantity()));
        }
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizeName(String value) {
        String normalized = value == null ? "" : value.trim().replaceAll("\\s+", " ");
        if (normalized.isBlank()) {
            throw new BadRequestException("Tên danh mục không được để trống");
        }
        return normalized;
    }

    private String normalizeKeyword(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeNote(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim();
        return normalized.length() <= 255 ? normalized : normalized.substring(0, 255);
    }

    private String normalizeSource(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim();
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }

    private BigDecimal normalizeMoney(BigDecimal value) {
        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Số tiền phải > 0");
        }
        return normalizeScale(value);
    }

    private BigDecimal normalizeNonNegativeMoney(BigDecimal value, String message) {
        if (value == null || value.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException(message);
        }
        return normalizeScale(value);
    }

    private BigDecimal normalizeScale(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal safeMoney(BigDecimal value) {
        return normalizeScale(value);
    }

    private DateRange resolveDateRange(LocalDate fromDate, LocalDate toDate) {
        LocalDate resolvedTo = toDate != null ? toDate : TimeUtil.todayVN();
        LocalDate resolvedFrom = fromDate != null ? fromDate : resolvedTo.minusDays(29);
        if (resolvedFrom.isAfter(resolvedTo)) {
            LocalDate temp = resolvedFrom;
            resolvedFrom = resolvedTo;
            resolvedTo = temp;
        }
        return new DateRange(resolvedFrom, resolvedTo, resolvedFrom.atStartOfDay(), resolvedTo.atTime(LocalTime.MAX));
    }

    private record DateRange(LocalDate fromDate, LocalDate toDate, LocalDateTime fromDateTime, LocalDateTime toDateTime) {
    }

    private record DailyFlow(BigDecimal totalInflow, BigDecimal totalOutflow) {
    }
}
