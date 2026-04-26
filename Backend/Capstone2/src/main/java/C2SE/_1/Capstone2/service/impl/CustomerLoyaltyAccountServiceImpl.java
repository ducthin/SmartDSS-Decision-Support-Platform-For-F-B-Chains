package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.CustomerLoyaltyAccountDTO;
import C2SE._1.Capstone2.entity.CustomerLoyaltyAccount;
import C2SE._1.Capstone2.entity.Order;
import C2SE._1.Capstone2.entity.Voucher;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.mapper.CustomerLoyaltyAccountMapper;
import C2SE._1.Capstone2.repository.CustomerLoyaltyAccountRepository;
import C2SE._1.Capstone2.repository.OrderRepository;
import C2SE._1.Capstone2.repository.VoucherRepository;
import C2SE._1.Capstone2.service.AppSettingService;
import C2SE._1.Capstone2.service.CustomerLoyaltyAccountService;
import C2SE._1.Capstone2.service.CustomerNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CustomerLoyaltyAccountServiceImpl implements CustomerLoyaltyAccountService {

    private static final String LOYALTY_POINTS_PER_10000_KEY = "loyalty_points_per_10000_vnd";
    private static final String TIER_DONG = "DONG";
    private static final String TIER_BAC = "BAC";
    private static final String TIER_VANG = "VANG";

    private final CustomerLoyaltyAccountRepository customerLoyaltyAccountRepository;
    private final CustomerLoyaltyAccountMapper customerLoyaltyAccountMapper;
    private final OrderRepository orderRepository;
    private final AppSettingService appSettingService;
    private final VoucherRepository voucherRepository;
    private final CustomerNotificationService customerNotificationService;

    @Value("${app.loyalty.points-per-10000-vnd:1}")
    private int pointsPerTenThousandVnd;

    @Override
    public List<CustomerLoyaltyAccountDTO> getAllAccounts() {
        backfillCompletedOrdersWithoutLoyalty();
        List<CustomerLoyaltyAccount> accounts = customerLoyaltyAccountRepository.findByTotalOrdersGreaterThan(
                0,
                Sort.by(Sort.Order.desc("lastOrderAt"), Sort.Order.desc("updatedAt"))
        );
        return customerLoyaltyAccountMapper.toDTOList(accounts);
    }

    @Override
    public CustomerLoyaltyAccountDTO getAccountByPhone(String phone) {
        backfillCompletedOrdersWithoutLoyalty();
        String normalizedPhone = normalizePhone(phone);
        CustomerLoyaltyAccount account = customerLoyaltyAccountRepository.findByPhone(normalizedPhone)
                .orElseGet(() -> customerLoyaltyAccountRepository.save(CustomerLoyaltyAccount.builder()
                        .phone(normalizedPhone)
                        .build()));
        refreshMonthlyTier(account);
        return customerLoyaltyAccountMapper.toDTO(account);
    }

    @Override
    public int awardPointsForOrder(String phone, BigDecimal orderAmount) {
        if (phone == null || phone.isBlank()) {
            return 0;
        }

        String normalizedPhone = normalizePhone(phone);
        BigDecimal safeOrderAmount = orderAmount == null ? BigDecimal.ZERO : orderAmount.max(BigDecimal.ZERO);

        CustomerLoyaltyAccount account = customerLoyaltyAccountRepository.findByPhoneForUpdate(normalizedPhone)
                .orElseGet(() -> CustomerLoyaltyAccount.builder()
                        .phone(normalizedPhone)
                        .build());

        int safeMultiplier = resolvePointsPerTenThousandVnd();
        int pointsAwarded = safeOrderAmount
                .divide(BigDecimal.valueOf(10000), 0, RoundingMode.DOWN)
                .intValue() * safeMultiplier;

        int currentBalance = account.getPointsBalance() == null ? 0 : account.getPointsBalance();
        int currentTotalPoints = account.getTotalPointsEarned() == null ? 0 : account.getTotalPointsEarned();
        int currentTotalOrders = account.getTotalOrders() == null ? 0 : account.getTotalOrders();
        BigDecimal currentSpent = account.getTotalSpent() == null ? BigDecimal.ZERO : account.getTotalSpent();

        account.setPointsBalance(currentBalance + pointsAwarded);
        account.setTotalPointsEarned(currentTotalPoints + pointsAwarded);
        account.setTotalOrders(currentTotalOrders + 1);
        account.setTotalSpent(currentSpent.add(safeOrderAmount));
        account.setLastOrderAt(LocalDateTime.now());
        refreshMonthlyTier(account);

        customerLoyaltyAccountRepository.save(account);
        return pointsAwarded;
    }

    private void backfillCompletedOrdersWithoutLoyalty() {
        List<Order> orders = orderRepository.findCompletedOrdersNeedingLoyaltyBackfill();
        for (Order order : orders) {
            int earnedPoints = awardPointsForOrder(order.getCustomerPhone(), order.getTotalAmount());
            order.setLoyaltyPointsEarned(earnedPoints);
            orderRepository.save(order);
        }
    }

    private int resolvePointsPerTenThousandVnd() {
        String configured = appSettingService.getValue(LOYALTY_POINTS_PER_10000_KEY);
        if (configured == null || configured.isBlank()) {
            return Math.max(pointsPerTenThousandVnd, 0);
        }
        try {
            return Math.max(Integer.parseInt(configured.trim()), 0);
        } catch (NumberFormatException ignored) {
            return Math.max(pointsPerTenThousandVnd, 0);
        }
    }

    private void refreshMonthlyTier(CustomerLoyaltyAccount account) {
        if (account == null || account.getPhone() == null || account.getPhone().isBlank()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from = now.minusDays(30);
        long monthlyOrders = orderRepository.countCompletedByPhoneInRange(account.getPhone(), from, now);
        BigDecimal monthlySpent = orderRepository.sumCompletedAmountByPhoneInRange(account.getPhone(), from, now);
        String tier = resolveTier(monthlyOrders, monthlySpent);

        account.setMonthlyOrderCount(Math.toIntExact(Math.min(monthlyOrders, Integer.MAX_VALUE)));
        account.setMonthlySpent(monthlySpent == null ? BigDecimal.ZERO : monthlySpent);
        account.setTier(tier);

        maybeIssueTierVoucher(account, tier, now);
    }

    private String resolveTier(long monthlyOrders, BigDecimal monthlySpent) {
        BigDecimal safeSpent = monthlySpent == null ? BigDecimal.ZERO : monthlySpent;
        if (monthlyOrders >= 10 || safeSpent.compareTo(BigDecimal.valueOf(1_500_000)) >= 0) {
            return TIER_VANG;
        }
        if (monthlyOrders >= 5 || safeSpent.compareTo(BigDecimal.valueOf(500_000)) >= 0) {
            return TIER_BAC;
        }
        return TIER_DONG;
    }

    private void maybeIssueTierVoucher(CustomerLoyaltyAccount account, String tier, LocalDateTime now) {
        if (!TIER_BAC.equals(tier) && !TIER_VANG.equals(tier)) {
            return;
        }

        String period = YearMonth.from(now).toString().replace("-", "");
        String phoneCode = account.getPhone().replaceAll("[^0-9A-Za-z]", "");
        String code = tier + "-" + phoneCode + "-" + period;
        if (voucherRepository.findByCodeIgnoreCase(code).isPresent()) {
            return;
        }

        BigDecimal discountPercent = TIER_VANG.equals(tier) ? BigDecimal.TEN : BigDecimal.valueOf(5);
        String tierLabel = TIER_VANG.equals(tier) ? "Vàng" : "Bạc";
        Voucher voucher = Voucher.builder()
                .code(code)
                .name("Ưu đãi hạng " + tierLabel)
                .description("Voucher tự động cho khách hàng hạng " + tierLabel + " trong tháng")
                .discountType(Voucher.DiscountType.PERCENT)
                .discountValue(discountPercent)
                .minOrderAmount(BigDecimal.ZERO)
                .maxDiscountAmount(TIER_VANG.equals(tier) ? BigDecimal.valueOf(100_000) : BigDecimal.valueOf(50_000))
                .validFrom(now)
                .validTo(now.plusDays(30))
                .active(true)
                .usageLimit(1)
                .usedCount(0)
                .customerPhone(account.getPhone())
                .build();
        Voucher savedVoucher = voucherRepository.save(voucher);
        customerNotificationService.notifyTierVoucherIssued(account.getPhone(), savedVoucher, tierLabel);
    }

    private String normalizePhone(String phone) {
        if (phone == null) {
            throw new BadRequestException("Số điện thoại không hợp lệ");
        }
        String normalized = phone.replaceAll("\\s+", "").trim();
        if (!normalized.matches("^[+0-9][0-9]{8,19}$")) {
            throw new BadRequestException("Số điện thoại không hợp lệ");
        }
        return normalized;
    }
}
