package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.CustomerLoyaltyAccountDTO;
import C2SE._1.Capstone2.dto.LoyaltyTierDTO;
import C2SE._1.Capstone2.dto.LoyaltyTierPolicyDTO;
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
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class CustomerLoyaltyAccountServiceImpl implements CustomerLoyaltyAccountService {

    private static final String LOYALTY_POINTS_PER_10000_KEY = "loyalty_points_per_10000_vnd";
    private static final String LOYALTY_TIERS_KEY = "loyalty_tiers_json";
    private static final String TIER_DONG = "DONG";
    private static final String TIER_BAC = "BAC";
    private static final String TIER_VANG = "VANG";
    private static final String BAC_MIN_ORDERS_KEY = "loyalty_tier_bac_min_orders";
    private static final String BAC_MIN_SPENT_KEY = "loyalty_tier_bac_min_spent";
    private static final String BAC_DISCOUNT_PERCENT_KEY = "loyalty_tier_bac_discount_percent";
    private static final String BAC_MAX_DISCOUNT_AMOUNT_KEY = "loyalty_tier_bac_max_discount_amount";
    private static final String VANG_MIN_ORDERS_KEY = "loyalty_tier_vang_min_orders";
    private static final String VANG_MIN_SPENT_KEY = "loyalty_tier_vang_min_spent";
    private static final String VANG_DISCOUNT_PERCENT_KEY = "loyalty_tier_vang_discount_percent";
    private static final String VANG_MAX_DISCOUNT_AMOUNT_KEY = "loyalty_tier_vang_max_discount_amount";

    private final CustomerLoyaltyAccountRepository customerLoyaltyAccountRepository;
    private final CustomerLoyaltyAccountMapper customerLoyaltyAccountMapper;
    private final OrderRepository orderRepository;
    private final AppSettingService appSettingService;
    private final VoucherRepository voucherRepository;
    private final CustomerNotificationService customerNotificationService;
    private final ObjectMapper objectMapper;

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
    @Transactional(readOnly = true)
    public List<LoyaltyTierDTO> getTiers() {
        return resolveTiers();
    }

    @Override
    public List<LoyaltyTierDTO> updateTiers(List<LoyaltyTierDTO> tiers) {
        List<LoyaltyTierDTO> normalized = normalizeAndValidateTiers(tiers);
        try {
            appSettingService.setValue(LOYALTY_TIERS_KEY, objectMapper.writeValueAsString(normalized));
        } catch (Exception ex) {
            throw new BadRequestException("Khong the luu cau hinh cap bac");
        }
        refreshAllAccountTiers();
        return resolveTiers();
    }

    @Override
    @Transactional(readOnly = true)
    public LoyaltyTierPolicyDTO getTierPolicy() {
        return resolveTierPolicy();
    }

    @Override
    public LoyaltyTierPolicyDTO updateTierPolicy(LoyaltyTierPolicyDTO dto) {
        validateTierPolicy(dto);
        updateTiers(List.of(
                tier("DONG", "Dong", 1, 0, BigDecimal.ZERO, false, BigDecimal.ZERO, BigDecimal.ZERO),
                tier(TIER_BAC, "Bac", 2, dto.getBacMinOrders(), dto.getBacMinSpent(), true, dto.getBacDiscountPercent(), dto.getBacMaxDiscountAmount()),
                tier(TIER_VANG, "Vang", 3, dto.getVangMinOrders(), dto.getVangMinSpent(), true, dto.getVangDiscountPercent(), dto.getVangMaxDiscountAmount())
        ));
        return resolveTierPolicy();
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
        List<LoyaltyTierDTO> tiers = resolveTiers().stream()
                .filter(t -> Boolean.TRUE.equals(t.getActive()))
                .sorted(Comparator.comparing(LoyaltyTierDTO::getDisplayOrder).reversed())
                .toList();
        for (LoyaltyTierDTO tier : tiers) {
            if (monthlyOrders >= tier.getMinOrders() || safeSpent.compareTo(tier.getMinSpent()) >= 0) {
                return tier.getCode();
            }
        }
        return TIER_DONG;
    }

    private void maybeIssueTierVoucher(CustomerLoyaltyAccount account, String tier, LocalDateTime now) {
        LoyaltyTierDTO tierConfig = findTier(tier);
        if (tierConfig == null
                || !Boolean.TRUE.equals(tierConfig.getVoucherEnabled())
                || tierConfig.getDiscountPercent().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        String period = YearMonth.from(now).toString().replace("-", "");
        String phoneCode = account.getPhone().replaceAll("[^0-9A-Za-z]", "");
        String code = tierConfig.getCode() + "-" + phoneCode + "-" + period;
        if (voucherRepository.findByCodeIgnoreCase(code).isPresent()) {
            return;
        }

        Voucher voucher = Voucher.builder()
                .code(code)
                .name("Uu dai hang " + tierConfig.getName())
                .description("Voucher tu dong cho khach hang hang " + tierConfig.getName() + " trong thang")
                .discountType(Voucher.DiscountType.PERCENT)
                .discountValue(tierConfig.getDiscountPercent())
                .minOrderAmount(BigDecimal.ZERO)
                .maxDiscountAmount(tierConfig.getMaxDiscountAmount())
                .validFrom(now)
                .validTo(now.plusDays(30))
                .active(true)
                .usageLimit(1)
                .usedCount(0)
                .customerPhone(account.getPhone())
                .build();
        Voucher savedVoucher = voucherRepository.save(voucher);
        customerNotificationService.notifyTierVoucherIssued(account.getPhone(), savedVoucher, tierConfig.getName());
    }

    private LoyaltyTierPolicyDTO resolveTierPolicy() {
        List<LoyaltyTierDTO> tiers = resolveTiers();
        LoyaltyTierDTO bac = findTier(tiers, TIER_BAC);
        LoyaltyTierDTO vang = findTier(tiers, TIER_VANG);
        return LoyaltyTierPolicyDTO.builder()
                .bacMinOrders(bac.getMinOrders())
                .bacMinSpent(bac.getMinSpent())
                .bacDiscountPercent(bac.getDiscountPercent())
                .bacMaxDiscountAmount(bac.getMaxDiscountAmount())
                .vangMinOrders(vang.getMinOrders())
                .vangMinSpent(vang.getMinSpent())
                .vangDiscountPercent(vang.getDiscountPercent())
                .vangMaxDiscountAmount(vang.getMaxDiscountAmount())
                .build();
    }

    private List<LoyaltyTierDTO> resolveTiers() {
        String configured = appSettingService.getValue(LOYALTY_TIERS_KEY);
        if (configured != null && !configured.isBlank()) {
            try {
                List<LoyaltyTierDTO> tiers = objectMapper.readValue(configured, new TypeReference<>() {});
                return normalizeAndValidateTiers(tiers);
            } catch (Exception ignored) {
                return defaultTiers();
            }
        }
        return legacyOrDefaultTiers();
    }

    private List<LoyaltyTierDTO> legacyOrDefaultTiers() {
        return List.of(
                tier("DONG", "Dong", 1, 0, BigDecimal.ZERO, false, BigDecimal.ZERO, BigDecimal.ZERO),
                tier(TIER_BAC, "Bac", 2,
                        readIntSetting(BAC_MIN_ORDERS_KEY, 5),
                        readDecimalSetting(BAC_MIN_SPENT_KEY, BigDecimal.valueOf(500_000)),
                        true,
                        readDecimalSetting(BAC_DISCOUNT_PERCENT_KEY, BigDecimal.valueOf(5)),
                        readDecimalSetting(BAC_MAX_DISCOUNT_AMOUNT_KEY, BigDecimal.valueOf(50_000))),
                tier(TIER_VANG, "Vang", 3,
                        readIntSetting(VANG_MIN_ORDERS_KEY, 10),
                        readDecimalSetting(VANG_MIN_SPENT_KEY, BigDecimal.valueOf(1_500_000)),
                        true,
                        readDecimalSetting(VANG_DISCOUNT_PERCENT_KEY, BigDecimal.TEN),
                        readDecimalSetting(VANG_MAX_DISCOUNT_AMOUNT_KEY, BigDecimal.valueOf(100_000)))
        );
    }

    private List<LoyaltyTierDTO> defaultTiers() {
        return List.of(
                tier("DONG", "Dong", 1, 0, BigDecimal.ZERO, false, BigDecimal.ZERO, BigDecimal.ZERO),
                tier(TIER_BAC, "Bac", 2, 5, BigDecimal.valueOf(500_000), true, BigDecimal.valueOf(5), BigDecimal.valueOf(50_000)),
                tier(TIER_VANG, "Vang", 3, 10, BigDecimal.valueOf(1_500_000), true, BigDecimal.TEN, BigDecimal.valueOf(100_000))
        );
    }

    private LoyaltyTierDTO tier(String code, String name, int displayOrder, int minOrders, BigDecimal minSpent,
                               boolean voucherEnabled, BigDecimal discountPercent, BigDecimal maxDiscountAmount) {
        return LoyaltyTierDTO.builder()
                .code(code)
                .name(name)
                .displayOrder(displayOrder)
                .minOrders(minOrders)
                .minSpent(minSpent)
                .voucherEnabled(voucherEnabled)
                .discountPercent(discountPercent)
                .maxDiscountAmount(maxDiscountAmount)
                .active(true)
                .build();
    }

    private List<LoyaltyTierDTO> normalizeAndValidateTiers(List<LoyaltyTierDTO> tiers) {
        if (tiers == null || tiers.isEmpty()) {
            throw new BadRequestException("Can it nhat mot cap bac thanh vien");
        }

        List<LoyaltyTierDTO> normalized = new ArrayList<>();
        Set<String> codes = new HashSet<>();
        for (int index = 0; index < tiers.size(); index += 1) {
            LoyaltyTierDTO source = tiers.get(index);
            if (source == null) {
                throw new BadRequestException("Cap bac khong hop le");
            }
            String code = normalizeTierCode(source.getCode());
            if (!codes.add(code)) {
                throw new BadRequestException("Ma cap bac bi trung: " + code);
            }
            String name = source.getName() == null ? "" : source.getName().trim();
            if (name.isBlank()) {
                throw new BadRequestException("Ten cap bac khong duoc de trong");
            }
            BigDecimal discountPercent = safeDecimal(source.getDiscountPercent());
            if (discountPercent.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new BadRequestException("Voucher giam khong duoc vuot qua 100%");
            }
            normalized.add(LoyaltyTierDTO.builder()
                    .code(code)
                    .name(name)
                    .displayOrder(index + 1)
                    .minOrders(Math.max(source.getMinOrders() == null ? 0 : source.getMinOrders(), 0))
                    .minSpent(safeDecimal(source.getMinSpent()))
                    .voucherEnabled(Boolean.TRUE.equals(source.getVoucherEnabled()))
                    .discountPercent(discountPercent)
                    .maxDiscountAmount(safeDecimal(source.getMaxDiscountAmount()))
                    .active(source.getActive() == null || Boolean.TRUE.equals(source.getActive()))
                    .build());
        }
        return normalized;
    }

    private String normalizeTierCode(String code) {
        if (code == null || code.isBlank()) {
            throw new BadRequestException("Ma cap bac khong duoc de trong");
        }
        String normalized = code.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9_]", "_");
        if (normalized.length() > 20) {
            normalized = normalized.substring(0, 20);
        }
        return normalized;
    }

    private BigDecimal safeDecimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.max(BigDecimal.ZERO);
    }

    private LoyaltyTierDTO findTier(String code) {
        return findTier(resolveTiers(), code);
    }

    private LoyaltyTierDTO findTier(List<LoyaltyTierDTO> tiers, String code) {
        return tiers.stream()
                .filter(t -> code.equalsIgnoreCase(t.getCode()))
                .findFirst()
                .orElseGet(() -> {
                    if (TIER_VANG.equals(code)) return defaultTiers().get(2);
                    if (TIER_BAC.equals(code)) return defaultTiers().get(1);
                    return defaultTiers().get(0);
                });
    }

    private int readIntSetting(String key, int defaultValue) {
        String value = appSettingService.getValue(key);
        if (value == null || value.isBlank()) return defaultValue;
        try {
            return Math.max(Integer.parseInt(value.trim()), 0);
        } catch (NumberFormatException ignored) {
            return defaultValue;
        }
    }

    private BigDecimal readDecimalSetting(String key, BigDecimal defaultValue) {
        String value = appSettingService.getValue(key);
        if (value == null || value.isBlank()) return defaultValue;
        try {
            return new BigDecimal(value.trim()).max(BigDecimal.ZERO);
        } catch (NumberFormatException ignored) {
            return defaultValue;
        }
    }

    private void validateTierPolicy(LoyaltyTierPolicyDTO dto) {
        if (dto.getVangMinOrders() < dto.getBacMinOrders()) {
            throw new BadRequestException("Nguong don hang Vang phai lon hon hoac bang hang Bac");
        }
        if (dto.getVangMinSpent().compareTo(dto.getBacMinSpent()) < 0) {
            throw new BadRequestException("Nguong chi tieu hang Vang phai lon hon hoac bang hang Bac");
        }
        if (dto.getVangDiscountPercent().compareTo(dto.getBacDiscountPercent()) < 0) {
            throw new BadRequestException("Uu dai hang Vang phai lon hon hoac bang hang Bac");
        }
    }

    private void refreshAllAccountTiers() {
        List<CustomerLoyaltyAccount> accounts = customerLoyaltyAccountRepository.findAll();
        for (CustomerLoyaltyAccount account : accounts) {
            refreshMonthlyTier(account);
        }
        customerLoyaltyAccountRepository.saveAll(accounts);
    }

    private String normalizePhone(String phone) {
        if (phone == null) {
            throw new BadRequestException("So dien thoai khong hop le");
        }
        String normalized = phone.replaceAll("\\s+", "").trim();
        if (!normalized.matches("^[+0-9][0-9]{8,19}$")) {
            throw new BadRequestException("So dien thoai khong hop le");
        }
        return normalized;
    }
}
