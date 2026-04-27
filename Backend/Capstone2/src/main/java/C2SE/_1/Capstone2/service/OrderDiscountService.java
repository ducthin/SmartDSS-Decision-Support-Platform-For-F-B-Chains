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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class OrderDiscountService {

    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);

    private final EventRepository eventRepository;
    private final HolidayCalendarRepository holidayCalendarRepository;
    private final VoucherRepository voucherRepository;

    public record DiscountResult(
            String normalizedVoucherCode,
            BigDecimal calendarDiscountPercent,
            String calendarDiscountLabel,
            BigDecimal calendarDiscountAmount,
            BigDecimal voucherDiscountAmount,
            BigDecimal totalDiscountAmount,
            String promotionNote
    ) {}

    public DiscountResult calculate(BigDecimal subtotal, String rawVoucherCode, String customerPhone, LocalDate orderDate) {
        return calculateInternal(subtotal, rawVoucherCode, customerPhone, orderDate, true);
    }

    public DiscountResult preview(BigDecimal subtotal, String rawVoucherCode, String customerPhone, LocalDate orderDate) {
        return calculateInternal(subtotal, rawVoucherCode, customerPhone, orderDate, false);
    }

    private DiscountResult calculateInternal(BigDecimal subtotal, String rawVoucherCode, String customerPhone, LocalDate orderDate, boolean consumeVoucher) {
        BigDecimal safeSubtotal = money(subtotal == null ? BigDecimal.ZERO : subtotal.max(BigDecimal.ZERO));

        CalendarDiscount calendarDiscount = resolveCalendarDiscount(orderDate == null ? LocalDate.now() : orderDate);
        BigDecimal calendarDiscountAmount = percentAmount(safeSubtotal, calendarDiscount.discountPercent());
        BigDecimal baseAfterCalendar = safeSubtotal.subtract(calendarDiscountAmount).max(BigDecimal.ZERO);

        VoucherDiscount voucherDiscount = resolveVoucherDiscount(rawVoucherCode, customerPhone, safeSubtotal, baseAfterCalendar, consumeVoucher);

        BigDecimal totalDiscount = money(calendarDiscountAmount.add(voucherDiscount.discountAmount()));
        if (totalDiscount.compareTo(safeSubtotal) > 0) {
            totalDiscount = safeSubtotal;
        }

        String promotionNote = buildPromotionNote(calendarDiscount, voucherDiscount);

        return new DiscountResult(
                voucherDiscount.normalizedVoucherCode(),
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

    private record VoucherDiscount(String normalizedVoucherCode, BigDecimal discountAmount) {}

    private VoucherDiscount resolveVoucherDiscount(String rawVoucherCode, String customerPhone, BigDecimal subtotal, BigDecimal baseAfterCalendar, boolean consumeVoucher) {
        if (rawVoucherCode == null || rawVoucherCode.isBlank()) {
            return new VoucherDiscount(null, BigDecimal.ZERO);
        }

        String normalizedCode = rawVoucherCode.trim().toUpperCase();
        Voucher voucher = (consumeVoucher
                ? voucherRepository.findByCodeForUpdate(normalizedCode)
                : voucherRepository.findByCodeIgnoreCase(normalizedCode))
                .orElseThrow(() -> new BadRequestException("Mã voucher không tồn tại"));
        String voucherPhone = normalizePhone(voucher.getCustomerPhone());
        String normalizedCustomerPhone = normalizePhone(customerPhone);
        if (voucherPhone != null && !voucherPhone.equals(normalizedCustomerPhone)) {
            throw new BadRequestException("Voucher này chỉ áp dụng cho đúng số điện thoại khách hàng");
        }

        LocalDateTime now = LocalDateTime.now();
        if (!Boolean.TRUE.equals(voucher.getActive())) {
            throw new BadRequestException("Voucher đã bị vô hiệu hóa");
        }
        if (voucher.getValidFrom() != null && now.isBefore(voucher.getValidFrom())) {
            throw new BadRequestException("Voucher chưa đến thời gian sử dụng");
        }
        if (voucher.getValidTo() != null && now.isAfter(voucher.getValidTo())) {
            throw new BadRequestException("Voucher đã hết hạn");
        }

        int usedCount = voucher.getUsedCount() == null ? 0 : voucher.getUsedCount();
        if (voucher.getUsageLimit() != null && usedCount >= voucher.getUsageLimit()) {
            throw new BadRequestException("Voucher đã hết lượt sử dụng");
        }

        BigDecimal minOrderAmount = voucher.getMinOrderAmount() == null ? BigDecimal.ZERO : voucher.getMinOrderAmount();
        if (subtotal.compareTo(minOrderAmount) < 0) {
            throw new BadRequestException("Đơn hàng chưa đạt giá trị tối thiểu để dùng voucher");
        }

        BigDecimal discountAmount;
        if (voucher.getDiscountType() == Voucher.DiscountType.PERCENT) {
            discountAmount = percentAmount(baseAfterCalendar, safePercent(voucher.getDiscountValue()));
        } else {
            discountAmount = money(voucher.getDiscountValue());
        }

        if (voucher.getMaxDiscountAmount() != null && discountAmount.compareTo(voucher.getMaxDiscountAmount()) > 0) {
            discountAmount = money(voucher.getMaxDiscountAmount());
        }

        if (discountAmount.compareTo(baseAfterCalendar) > 0) {
            discountAmount = baseAfterCalendar;
        }

        if (discountAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Voucher không thể áp dụng cho đơn này");
        }

        if (consumeVoucher) {
            voucher.setUsedCount(usedCount + 1);
            voucherRepository.save(voucher);
        }

        return new VoucherDiscount(normalizedCode, money(discountAmount));
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        return phone.replaceAll("\\s+", "").trim();
    }

    private String buildPromotionNote(CalendarDiscount calendarDiscount, VoucherDiscount voucherDiscount) {
        boolean hasCalendar = calendarDiscount.discountPercent().compareTo(BigDecimal.ZERO) > 0;
        boolean hasVoucher = voucherDiscount.normalizedVoucherCode() != null;

        if (hasCalendar && hasVoucher) {
            return calendarDiscount.sourceLabel() + " + Voucher " + voucherDiscount.normalizedVoucherCode();
        }
        if (hasCalendar) {
            return calendarDiscount.sourceLabel();
        }
        if (hasVoucher) {
            return "Voucher " + voucherDiscount.normalizedVoucherCode();
        }
        return null;
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
