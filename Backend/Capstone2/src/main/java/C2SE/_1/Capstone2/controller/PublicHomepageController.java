package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.OrderDTO;
import C2SE._1.Capstone2.dto.PublicOnlineOrderDTO;
import C2SE._1.Capstone2.dto.PublicPersonalVoucherDTO;
import C2SE._1.Capstone2.dto.PublicPromotionDTO;
import C2SE._1.Capstone2.dto.QrDiscountPreviewDTO;
import C2SE._1.Capstone2.entity.Event;
import C2SE._1.Capstone2.entity.HolidayCalendar;
import C2SE._1.Capstone2.entity.Voucher;
import C2SE._1.Capstone2.repository.EventRepository;
import C2SE._1.Capstone2.repository.HolidayCalendarRepository;
import C2SE._1.Capstone2.repository.VoucherRepository;
import C2SE._1.Capstone2.service.PublicOnlineOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import C2SE._1.Capstone2.util.TimeUtil;

@RestController
@RequestMapping("/api/v1/public/home")
@RequiredArgsConstructor
public class PublicHomepageController {

    private static final DateTimeFormatter DATE_TIME_VN = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE_VN = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final EventRepository eventRepository;
    private final HolidayCalendarRepository holidayCalendarRepository;
    private final VoucherRepository voucherRepository;
    private final PublicOnlineOrderService publicOnlineOrderService;

    @GetMapping("/promotions")
    public ResponseEntity<ApiResponse<List<PublicPromotionDTO>>> getPromotions() {
        LocalDate today = TimeUtil.todayVN();
        LocalDate toDate = today.plusDays(30);
        LocalDateTime now = TimeUtil.nowVN();

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

        for (Voucher v : voucherRepository.findActiveAvailablePublicVouchers(now)) {
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

    @GetMapping("/orders/discount-preview")
    public ResponseEntity<ApiResponse<QrDiscountPreviewDTO>> previewDiscount(
            @RequestParam BigDecimal subtotal,
            @RequestParam(required = false) String voucherCode,
            @RequestParam(required = false) String customerPhone
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                publicOnlineOrderService.previewDiscount(subtotal, voucherCode, customerPhone)
        ));
    }

    @PostMapping("/orders")
    public ResponseEntity<ApiResponse<OrderDTO>> createOnlineOrder(@Valid @RequestBody PublicOnlineOrderDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(publicOnlineOrderService.createOnlineOrder(dto), "Đặt hàng online thành công"));
    }

    @GetMapping("/personal-vouchers")
    public ResponseEntity<ApiResponse<List<PublicPersonalVoucherDTO>>> getPersonalVouchers(
            @RequestParam(required = false) String customerPhone
    ) {
        String normalizedPhone = normalizePhone(customerPhone);
        if (normalizedPhone == null) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }
        LocalDateTime now = TimeUtil.nowVN();
        List<String> phoneCandidates = phoneLookupCandidates(normalizedPhone);
        List<PublicPersonalVoucherDTO> data = voucherRepository.findAvailablePersonalVouchers(phoneCandidates, now).stream()
                .map(v -> PublicPersonalVoucherDTO.builder()
                        .code(v.getCode() == null ? null : v.getCode().trim().toUpperCase())
                        .title(v.getName())
                        .discountLabel(buildDiscountLabel(v))
                        .validUntil(v.getValidTo() == null ? null : v.getValidTo().format(DATE_TIME_VN))
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    private String money(BigDecimal v) {
        if (v == null) return "0";
        return v.stripTrailingZeros().toPlainString();
    }

    private String buildDiscountLabel(Voucher v) {
        String discountLabel = v.getDiscountType() == Voucher.DiscountType.PERCENT
                ? "Giảm " + money(v.getDiscountValue()) + "%"
                : "Giảm " + money(v.getDiscountValue()) + "đ";
        if (v.getMaxDiscountAmount() != null && v.getDiscountType() == Voucher.DiscountType.PERCENT) {
            discountLabel += " · tối đa " + money(v.getMaxDiscountAmount()) + "đ";
        }
        return discountLabel;
    }

    private String normalizePhone(String phone) {
        if (phone == null) return null;
        String cleaned = phone.replaceAll("[^0-9+]", "");
        if (cleaned.isBlank()) return null;
        if (cleaned.startsWith("+84")) return "0" + cleaned.substring(3);
        if (cleaned.startsWith("84") && cleaned.length() > 9) return "0" + cleaned.substring(2);
        return cleaned;
    }

    private List<String> phoneLookupCandidates(String normalizedPhone) {
        if (normalizedPhone == null || normalizedPhone.isBlank()) return List.of();
        List<String> candidates = new ArrayList<>();
        candidates.add(normalizedPhone);
        if (normalizedPhone.startsWith("0") && normalizedPhone.length() > 1) {
            candidates.add("84" + normalizedPhone.substring(1));
            candidates.add("+84" + normalizedPhone.substring(1));
        } else if (normalizedPhone.startsWith("84") && normalizedPhone.length() > 2) {
            candidates.add("0" + normalizedPhone.substring(2));
            candidates.add("+" + normalizedPhone);
        } else if (normalizedPhone.startsWith("+84") && normalizedPhone.length() > 3) {
            candidates.add("0" + normalizedPhone.substring(3));
            candidates.add(normalizedPhone.substring(1));
        }
        return candidates.stream().distinct().toList();
    }
}
