package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.PublicPromotionDTO;
import C2SE._1.Capstone2.entity.Event;
import C2SE._1.Capstone2.entity.HolidayCalendar;
import C2SE._1.Capstone2.entity.Voucher;
import C2SE._1.Capstone2.repository.EventRepository;
import C2SE._1.Capstone2.repository.HolidayCalendarRepository;
import C2SE._1.Capstone2.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/public/home")
@RequiredArgsConstructor
public class PublicHomepageController {

    private static final DateTimeFormatter DATE_TIME_VN = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE_VN = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final EventRepository eventRepository;
    private final HolidayCalendarRepository holidayCalendarRepository;
    private final VoucherRepository voucherRepository;

    @GetMapping("/promotions")
    public ResponseEntity<ApiResponse<List<PublicPromotionDTO>>> getPromotions() {
        LocalDate today = LocalDate.now();
        LocalDate toDate = today.plusDays(30);
        LocalDateTime now = LocalDateTime.now();

        List<PublicPromotionDTO> items = new ArrayList<>();

        for (Event e : eventRepository.findActiveOverlappingDateRange(today, toDate)) {
            if (e.getDiscountPercent() == null || e.getDiscountPercent().compareTo(BigDecimal.ZERO) <= 0) continue;
            items.add(PublicPromotionDTO.builder()
                    .id("event-" + e.getId())
                    .sourceType("EVENT")
                    .badge("Sự kiện")
                    .title(e.getName())
                    .description(e.getDescription())
                    .discountLabel("Giảm " + money(e.getDiscountPercent()) + "%")
                    .validUntil(e.getEndDate() == null ? null : e.getEndDate().format(DATE_VN))
                    .build());
        }

        for (HolidayCalendar h : holidayCalendarRepository.findByHolidayDateBetweenOrderByHolidayDateAsc(today, toDate)) {
            if (h.getDiscountPercent() == null || h.getDiscountPercent().compareTo(BigDecimal.ZERO) <= 0) continue;
            items.add(PublicPromotionDTO.builder()
                    .id("holiday-" + h.getId())
                    .sourceType("HOLIDAY")
                    .badge("Ngày lễ")
                    .title(h.getName())
                    .description(h.getDescription())
                    .discountLabel("Giảm " + money(h.getDiscountPercent()) + "%")
                    .validUntil(h.getHolidayDate() == null ? null : h.getHolidayDate().format(DATE_VN))
                    .build());
        }

        for (Voucher v : voucherRepository.findAll()) {
            if (!Boolean.TRUE.equals(v.getActive())) continue;
            if (v.getValidFrom() != null && now.isBefore(v.getValidFrom())) continue;
            if (v.getValidTo() != null && now.isAfter(v.getValidTo())) continue;
            int usedCount = v.getUsedCount() == null ? 0 : v.getUsedCount();
            if (v.getUsageLimit() != null && usedCount >= v.getUsageLimit()) continue;

            String discountLabel = v.getDiscountType() == Voucher.DiscountType.PERCENT
                    ? "Giảm " + money(v.getDiscountValue()) + "%"
                    : "Giảm " + money(v.getDiscountValue()) + "đ";
            if (v.getMaxDiscountAmount() != null && v.getDiscountType() == Voucher.DiscountType.PERCENT) {
                discountLabel += " · tối đa " + money(v.getMaxDiscountAmount()) + "đ";
            }

            items.add(PublicPromotionDTO.builder()
                    .id("voucher-" + v.getId())
                    .sourceType("VOUCHER")
                    .badge("Voucher")
                    .title(v.getName())
                    .description(v.getDescription())
                    .discountLabel(discountLabel)
                    .validUntil(v.getValidTo() == null ? null : v.getValidTo().format(DATE_TIME_VN))
                    .build());
        }

        return ResponseEntity.ok(ApiResponse.success(items.stream().limit(6).toList()));
    }

    private String money(BigDecimal v) {
        if (v == null) return "0";
        return v.stripTrailingZeros().toPlainString();
    }
}

