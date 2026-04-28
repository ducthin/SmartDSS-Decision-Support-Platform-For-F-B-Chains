package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.entity.Event;
import C2SE._1.Capstone2.entity.HolidayCalendar;
import C2SE._1.Capstone2.entity.Voucher;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.repository.EventRepository;
import C2SE._1.Capstone2.repository.HolidayCalendarRepository;
import C2SE._1.Capstone2.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
public class OrderDiscountService {

    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);

    private final EventRepository eventRepository;
    private final HolidayCalendarRepository holidayCalendarRepository;
    private final VoucherRepository voucherRepository;

    public record DiscountResult(
            List<String> normalizedVoucherCodes,
            BigDecimal calendarDiscountPercent,
            String calendarDiscountLabel,
            BigDecimal calendarDiscountAmount,
            BigDecimal voucherDiscountAmount,
            BigDecimal totalDiscountAmount,
            String promotionNote
    ) {
        public String normalizedVoucherCode() {
            return normalizedVoucherCodes == null || normalizedVoucherCodes.isEmpty() ? null : normalizedVoucherCodes.get(0);
        }

        public String normalizedVoucherCodesJoined() {
            return normalizedVoucherCodes == null || normalizedVoucherCodes.isEmpty()
                    ? null
                    : String.join(",", normalizedVoucherCodes);
        }
    }

    public DiscountResult calculate(BigDecimal subtotal, String rawVoucherCode, String customerPhone, LocalDate orderDate) {
        return calculateInternal(subtotal, rawVoucherCode, customerPhone, orderDate, true);
    }

    @Transactional(readOnly = true, noRollbackFor = BadRequestException.class)
    public DiscountResult preview(BigDecimal subtotal, String rawVoucherCode, String customerPhone, LocalDate orderDate) {
        return calculateInternal(subtotal, rawVoucherCode, customerPhone, orderDate, false);
    }

    private DiscountResult calculateInternal(BigDecimal subtotal, String rawVoucherCode, String customerPhone, LocalDate orderDate, boolean consumeVoucher) {
        BigDecimal safeSubtotal = money(subtotal == null ? BigDecimal.ZERO : subtotal.max(BigDecimal.ZERO));

        CalendarDiscount calendarDiscount = resolveCalendarDiscount(orderDate == null ? LocalDate.now() : orderDate);
        BigDecimal calendarDiscountAmount = percentAmount(safeSubtotal, calendarDiscount.discountPercent());
        BigDecimal baseAfterCalendar = safeSubtotal.subtract(calendarDiscountAmount).max(BigDecimal.ZERO);

        List<String> requestedVoucherCodes = splitVoucherCodes(rawVoucherCode);
        VoucherDiscount voucherDiscount = resolveVoucherDiscounts(requestedVoucherCodes, customerPhone, safeSubtotal, baseAfterCalendar, consumeVoucher);

        BigDecimal totalDiscount = money(calendarDiscountAmount.add(voucherDiscount.discountAmount()));
        if (totalDiscount.compareTo(safeSubtotal) > 0) {
            totalDiscount = safeSubtotal;
        }

        String promotionNote = buildPromotionNote(calendarDiscount, voucherDiscount);

        return new DiscountResult(
                voucherDiscount.normalizedVoucherCodes(),
                calendarDiscount.discountPercent(),
                calendarDiscount.sourceLabel(),
                calendarDiscountAmount,
                voucherDiscount.discountAmount(),
                totalDiscount,
                promotionNote
        );
    }

    private record CalendarDiscount(BigDecimal discountPercent, String sourceLabel) {}

    private CalendarDiscount resolveCalendarDiscount(LocalDate orderDate) {
        BigDecimal bestPercent = BigDecimal.ZERO;
        String bestSource = null;

        List<Event> events = eventRepository.findActiveByDate(orderDate);
        for (Event event : events) {
            BigDecimal percent = safePercent(event.getDiscountPercent());
            if (percent.compareTo(bestPercent) > 0) {
                bestPercent = percent;
                bestSource = "Sự kiện: " + event.getName();
            }
        }

        List<HolidayCalendar> holidays = holidayCalendarRepository.findByHolidayDate(orderDate);
        for (HolidayCalendar holiday : holidays) {
            BigDecimal percent = safePercent(holiday.getDiscountPercent());
            if (percent.compareTo(bestPercent) > 0) {
                bestPercent = percent;
                bestSource = "Ngày lễ: " + holiday.getName();
            }
        }

        return new CalendarDiscount(bestPercent, bestSource);
    }

    private record VoucherDiscount(List<String> normalizedVoucherCodes, BigDecimal discountAmount) {}

    private VoucherDiscount resolveVoucherDiscounts(List<String> requestedVoucherCodes, String customerPhone, BigDecimal subtotal, BigDecimal baseAfterCalendar, boolean consumeVoucher) {
        if (requestedVoucherCodes == null || requestedVoucherCodes.isEmpty()) {
            return new VoucherDiscount(List.of(), BigDecimal.ZERO);
        }
        String normalizedCustomerPhone = normalizePhone(customerPhone);
        LocalDateTime now = LocalDateTime.now();
        BigDecimal runningBase = baseAfterCalendar;
        BigDecimal totalDiscountAmount = BigDecimal.ZERO;
        List<Voucher> toConsume = new ArrayList<>();
        List<String> normalizedCodes = new ArrayList<>();

        for (String normalizedCode : requestedVoucherCodes) {
            Voucher voucher = (consumeVoucher
                    ? voucherRepository.findByCodeForUpdate(normalizedCode)
                    : voucherRepository.findByCodeIgnoreCase(normalizedCode))
                    .orElseThrow(() -> new BadRequestException("Mã voucher không tồn tại: " + normalizedCode));
            String voucherPhone = normalizePhone(voucher.getCustomerPhone());
            if (voucherPhone != null && !voucherPhone.equals(normalizedCustomerPhone)) {
                throw new BadRequestException("Voucher " + normalizedCode + " chỉ áp dụng cho đúng số điện thoại khách hàng");
            }
            if (!Boolean.TRUE.equals(voucher.getActive())) {
                throw new BadRequestException("Voucher " + normalizedCode + " đã bị vô hiệu hóa");
            }
            if (voucher.getValidFrom() != null && now.isBefore(voucher.getValidFrom())) {
                throw new BadRequestException("Voucher " + normalizedCode + " chưa đến thời gian sử dụng");
            }
            if (voucher.getValidTo() != null && now.isAfter(voucher.getValidTo())) {
                throw new BadRequestException("Voucher " + normalizedCode + " đã hết hạn");
            }

            int usedCount = voucher.getUsedCount() == null ? 0 : voucher.getUsedCount();
            if (voucher.getUsageLimit() != null && usedCount >= voucher.getUsageLimit()) {
                throw new BadRequestException("Voucher " + normalizedCode + " đã hết lượt sử dụng");
            }

            BigDecimal minOrderAmount = voucher.getMinOrderAmount() == null ? BigDecimal.ZERO : voucher.getMinOrderAmount();
            if (subtotal.compareTo(minOrderAmount) < 0) {
                throw new BadRequestException("Đơn hàng chưa đạt tối thiểu để dùng voucher " + normalizedCode);
            }

            BigDecimal lineDiscountAmount;
            if (voucher.getDiscountType() == Voucher.DiscountType.PERCENT) {
                lineDiscountAmount = percentAmount(runningBase, safePercent(voucher.getDiscountValue()));
            } else {
                lineDiscountAmount = money(voucher.getDiscountValue());
            }
            if (voucher.getMaxDiscountAmount() != null && lineDiscountAmount.compareTo(voucher.getMaxDiscountAmount()) > 0) {
                lineDiscountAmount = money(voucher.getMaxDiscountAmount());
            }
            if (lineDiscountAmount.compareTo(runningBase) > 0) {
                lineDiscountAmount = runningBase;
            }
            if (lineDiscountAmount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new BadRequestException("Voucher " + normalizedCode + " không thể áp dụng cho đơn này");
            }

            runningBase = runningBase.subtract(lineDiscountAmount).max(BigDecimal.ZERO);
            totalDiscountAmount = totalDiscountAmount.add(lineDiscountAmount);
            normalizedCodes.add(normalizedCode);
            if (consumeVoucher) {
                voucher.setUsedCount(usedCount + 1);
                toConsume.add(voucher);
            }
        }

        if (consumeVoucher && !toConsume.isEmpty()) {
            voucherRepository.saveAll(toConsume);
        }

        return new VoucherDiscount(List.copyOf(normalizedCodes), money(totalDiscountAmount));
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        return phone.replaceAll("\\s+", "").trim();
    }

    private String buildPromotionNote(CalendarDiscount calendarDiscount, VoucherDiscount voucherDiscount) {
        boolean hasCalendar = calendarDiscount.discountPercent().compareTo(BigDecimal.ZERO) > 0;
        boolean hasVoucher = voucherDiscount.normalizedVoucherCodes() != null && !voucherDiscount.normalizedVoucherCodes().isEmpty();

        if (hasCalendar && hasVoucher) {
            return calendarDiscount.sourceLabel() + " + Voucher " + String.join(", ", voucherDiscount.normalizedVoucherCodes());
        }
        if (hasCalendar) {
            return calendarDiscount.sourceLabel();
        }
        if (hasVoucher) {
            return "Voucher " + String.join(", ", voucherDiscount.normalizedVoucherCodes());
        }
        return null;
    }

    private List<String> splitVoucherCodes(String rawVoucherCodes) {
        if (rawVoucherCodes == null || rawVoucherCodes.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(rawVoucherCodes.split("[,;\\s]+"))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .map(this::normalizeVoucherToken)
                .distinct()
                .toList();
    }

    private String normalizeVoucherToken(String raw) {
        String upper = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
        if (upper.isEmpty()) {
            return upper;
        }
        // Let "ADĐ" match stored "ADD".
        upper = upper.replace('Đ', 'D');
        String normalized = Normalizer.normalize(upper, Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}+", "");
    }

    private BigDecimal safePercent(BigDecimal percent) {
        if (percent == null || percent.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        if (percent.compareTo(ONE_HUNDRED) > 0) {
            return ONE_HUNDRED;
        }
        return percent;
    }

    private BigDecimal percentAmount(BigDecimal amount, BigDecimal percent) {
        if (amount == null || percent == null || amount.compareTo(BigDecimal.ZERO) <= 0 || percent.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return money(amount.multiply(percent).divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP));
    }

    private BigDecimal money(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
