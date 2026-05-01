package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.*;
import C2SE._1.Capstone2.entity.*;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.InsufficientStockException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.MenuItemMapper;
import C2SE._1.Capstone2.mapper.OrderMapper;
import C2SE._1.Capstone2.repository.*;
import C2SE._1.Capstone2.service.InvoicePdfService;
import C2SE._1.Capstone2.service.OrderDiscountService;
import C2SE._1.Capstone2.service.QrOrderService;
import C2SE._1.Capstone2.util.DrinkOptionsJsonMapper;
import C2SE._1.Capstone2.util.DrinkOrderPricingHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.PageRequest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import jakarta.mail.internet.MimeMessage;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Duration;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class QrOrderServiceImpl implements QrOrderService {

    private final DiningTableRepository diningTableRepository;
    private final MenuItemRepository menuItemRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final StaffCallRepository staffCallRepository;
    private final RecipeRepository recipeRepository;
    private final InventoryRepository inventoryRepository;
    private final OrderMapper orderMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final MenuItemMapper menuItemMapper;
    private final DrinkOptionsJsonMapper drinkOptionsJsonMapper;
    private final DrinkOrderPricingHelper drinkOrderPricingHelper;
    private final OrderDiscountService orderDiscountService;
    private final InvoiceRequestRepository invoiceRequestRepository;
    private final InvoicePdfService invoicePdfService;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.mail.from:}")
    private String mailFrom;

    @Value("${app.notification.store-name:SmartDSS Coffee}")
    private String storeName;

    @Value("${app.tax.vat.rate-percent:8}")
    private BigDecimal vatRatePercent;

    @Value("${app.tax.vat.price-includes-vat:true}")
    private boolean priceIncludesVat;

    private DiningTable validateAndGetTable(String qrToken) {
        DiningTable table = diningTableRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new ResourceNotFoundException("DiningTable", "qrToken", qrToken));
        if (!Boolean.TRUE.equals(table.getActive())) {
            throw new BadRequestException("Bàn này hiện không hoạt động");
        }
        return table;
    }

    @Override
    @Transactional(readOnly = true)
    public DiningTableDTO getTableInfo(String qrToken) {
        DiningTable table = validateAndGetTable(qrToken);
        return DiningTableDTO.builder()
                .id(table.getId())
                .name(table.getName())
                .active(table.getActive())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MenuItemDTO> getMenuForTable(String qrToken) {
        validateAndGetTable(qrToken);
        LocalDate today = LocalDate.now();
        List<Long> bestSellingIds = orderItemRepository.findBestSellingMenuItemIdsByOrderQuantity(
                OrderStatus.COMPLETED,
                today.minusDays(30).atStartOfDay(),
                today.atTime(LocalTime.MAX),
                PageRequest.of(0, 5)
        );
        return menuItemRepository.findByAvailableTrue().stream()
                .map(item -> {
                    MenuItemDTO dto = menuItemMapper.toDTO(item);
                    drinkOptionsJsonMapper.attachDrinkLists(dto, item);
                    dto.setBadgeBestSeller(Boolean.TRUE.equals(dto.getBadgeBestSeller()) || bestSellingIds.contains(dto.getId()));
                    return dto;
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public QrDiscountPreviewDTO previewDiscount(String qrToken, BigDecimal subtotal, String voucherCode, String customerPhone) {
        validateAndGetTable(qrToken);
        BigDecimal safeSubtotal = subtotal == null ? BigDecimal.ZERO : subtotal.max(BigDecimal.ZERO);
        OrderDiscountService.DiscountResult calendarOnlyResult = orderDiscountService.preview(
                safeSubtotal,
                null,
                null,
                LocalDate.now());
        OrderDiscountService.DiscountResult discountResult = calendarOnlyResult;
        String voucherError = null;

        if (StringUtils.hasText(voucherCode)) {
            try {
                discountResult = orderDiscountService.preview(
                        safeSubtotal,
                        voucherCode,
                        normalizeCustomerPhoneForPreview(customerPhone),
                        LocalDate.now());
            } catch (BadRequestException ex) {
                discountResult = calendarOnlyResult;
                voucherError = ex.getMessage();
            }
        }
        BigDecimal finalAmount = safeSubtotal.subtract(discountResult.totalDiscountAmount()).max(BigDecimal.ZERO);
        return QrDiscountPreviewDTO.builder()
                .subtotalAmount(safeSubtotal)
                .calendarDiscountPercent(discountResult.calendarDiscountPercent())
                .calendarDiscountLabel(discountResult.calendarDiscountLabel())
                .calendarDiscountAmount(discountResult.calendarDiscountAmount())
                .voucherDiscountAmount(discountResult.voucherDiscountAmount())
                .totalDiscountAmount(discountResult.totalDiscountAmount())
                .finalAmount(finalAmount)
                .voucherCode(discountResult.normalizedVoucherCode())
                .voucherCodes(discountResult.normalizedVoucherCodes())
                .voucherError(voucherError)
                .promotionNote(discountResult.promotionNote())
                .build();
    }

    @Override
    public OrderDTO placeOrder(String qrToken, QrOrderDTO qrOrderDTO) {
        DiningTable table = validateAndGetTable(qrToken);

        Order order = Order.builder()
                .status(OrderStatus.PENDING)
                .note(qrOrderDTO.getNote())
                .tableNumber(table.getName())
            .customerPhone(normalizeCustomerPhone(qrOrderDTO.getCustomerPhone()))
                .qrClientSessionId(qrOrderDTO.getClientSessionId().trim())
                .createdBy(null)
                .totalAmount(BigDecimal.ZERO)
                .build();

        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (OrderItemDTO itemDTO : qrOrderDTO.getOrderItems()) {
            MenuItem menuItem = menuItemRepository.findById(itemDTO.getMenuItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("MenuItem", "id", itemDTO.getMenuItemId()));

            if (!Boolean.TRUE.equals(menuItem.getAvailable())) {
                throw new BadRequestException("Món \"" + menuItem.getName() + "\" hiện không còn phục vụ");
            }

            DrinkOrderPricingHelper.ResolvedDrinkLine resolved = drinkOrderPricingHelper.resolve(
                    menuItem,
                    itemDTO.getSelectedSizeCode(),
                    itemDTO.getSelectedToppingCodes());

            BigDecimal unitPrice = resolved.unitPrice();
            BigDecimal subtotal = unitPrice.multiply(BigDecimal.valueOf(itemDTO.getQuantity()));

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .menuItem(menuItem)
                    .quantity(itemDTO.getQuantity())
                    .unitPrice(unitPrice)
                    .subtotal(subtotal)
                    .selectedSizeCode(resolved.sizeCode())
                    .selectedSizeLabel(resolved.sizeLabel())
                    .selectedToppingsJson(resolved.toppingsJson())
                    .build();

            orderItems.add(orderItem);
            totalAmount = totalAmount.add(subtotal);
        }

        validateInventoryAvailability(orderItems);

        BigDecimal subtotalAmount = totalAmount;
        OrderDiscountService.DiscountResult discountResult = orderDiscountService.calculate(
            subtotalAmount,
            qrOrderDTO.getVoucherCode(),
            order.getCustomerPhone(),
            LocalDate.now());
        BigDecimal finalTotalAmount = subtotalAmount.subtract(discountResult.totalDiscountAmount()).max(BigDecimal.ZERO);

        order.setOrderItems(orderItems);
        order.setSubtotalAmount(subtotalAmount);
        order.setDiscountAmount(discountResult.totalDiscountAmount());
        order.setVoucherCode(discountResult.normalizedVoucherCodesJoined());
        order.setPromotionNote(discountResult.promotionNote());
        order.setTotalAmount(finalTotalAmount);

        Order saved = orderRepository.save(order);
        OrderDTO result = orderMapper.toDTO(saved);
        messagingTemplate.convertAndSend("/topic/orders", result);
        if (result.getQrClientSessionId() != null && !result.getQrClientSessionId().isBlank()) {
            messagingTemplate.convertAndSend("/topic/qr-orders/" + result.getQrClientSessionId(), result);
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getTableOrders(String qrToken, String customerPhone, String clientSessionId) {
        DiningTable table = diningTableRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new ResourceNotFoundException("DiningTable", "qrToken", qrToken));
        String phoneValue;
        try {
            phoneValue = normalizeCustomerPhone(customerPhone);
        } catch (BadRequestException ex) {
            phoneValue = null;
        }
        final String normalizedPhone = phoneValue;
        final List<String> phoneCandidates = phoneLookupCandidates(normalizedPhone);
        List<Order> orders = phoneCandidates.isEmpty()
                ? List.of()
                : orderRepository.findByTableNumberAndCustomerPhoneInOrderByCreatedAtDesc(table.getName(), phoneCandidates);
        boolean loadedByPhone = !orders.isEmpty();
        if (orders.isEmpty()) {
            String sid = normalizeOptionalSessionId(clientSessionId);
            if (sid != null) {
                orders = orderRepository.findByTableNumberAndQrClientSessionIdOrderByCreatedAtDesc(table.getName(), sid);
            }
        }
        List<OrderDTO> dtos = orderMapper.toDTOList(orders);
        return !loadedByPhone
                ? dtos
                : dtos.stream()
                        .filter(d -> phoneCandidates.contains(d.getCustomerPhone()))
                        .toList();
    }

    @Override
    public QrInvoiceResponseDTO requestInvoice(String qrToken, QrInvoiceRequestDTO requestDTO) {
        DiningTable table = validateAndGetTable(qrToken);
        String sid = normalizeSessionId(requestDTO.getClientSessionId());
        InvoiceRequest.DeliveryMethod deliveryMethod = parseInvoiceDeliveryMethod(requestDTO.getDeliveryMethod());

        Order order = orderRepository.findById(requestDTO.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", requestDTO.getOrderId()));
        String requestPhone = normalizeCustomerPhone(requestDTO.getPhone());
        boolean sameSession = sid.equals(order.getQrClientSessionId());
        boolean sameCustomerPhone = requestPhone != null && requestPhone.equals(order.getCustomerPhone());
        if (!table.getName().equals(order.getTableNumber()) || (!sameSession && !sameCustomerPhone)) {
            throw new BadRequestException("Không thể xuất hóa đơn cho đơn không thuộc SĐT/phiên QR này");
        }
        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new BadRequestException("Chỉ xuất hóa đơn cho đơn đã hoàn thành/thanh toán");
        }

        String invoiceHtml = buildInvoiceHtml(table, order, requestDTO);
        InvoiceRequest saved = invoiceRequestRepository.save(InvoiceRequest.builder()
                .order(order)
                .qrToken(qrToken)
                .clientSessionId(sid)
                .deliveryMethod(deliveryMethod)
                .status(deliveryMethod == InvoiceRequest.DeliveryMethod.DIRECT
                        ? InvoiceRequest.Status.READY
                        : InvoiceRequest.Status.REQUESTED)
                .taxCode(normalizeRequired(requestDTO.getTaxCode()))
                .companyName(normalizeRequired(requestDTO.getCompanyName()))
                .address(normalizeRequired(requestDTO.getAddress()))
                .email(normalizeRequired(requestDTO.getEmail()))
                .phone(normalizeRequired(requestDTO.getPhone()))
                .invoiceHtml(invoiceHtml)
                .build());
        String message = resolveInvoiceMessage(saved.getDeliveryMethod(), false);

        if (saved.getDeliveryMethod() == InvoiceRequest.DeliveryMethod.EMAIL) {
            boolean sent = sendInvoiceEmailIfConfigured(saved, invoiceHtml);
            if (sent) {
                saved.setStatus(InvoiceRequest.Status.SENT);
                saved = invoiceRequestRepository.save(saved);
            }
            message = resolveInvoiceMessage(saved.getDeliveryMethod(), sent);
        }

        byte[] invoicePdf = invoicePdfService.generatePdf(invoiceHtml);
        QrInvoiceResponseDTO response = toInvoiceResponse(saved, message, invoiceHtml, invoicePdf);
        messagingTemplate.convertAndSend("/topic/invoice-requests", toInvoiceResponse(saved, message, invoiceHtml, null));
        return response;
    }

    private QrInvoiceResponseDTO toInvoiceResponse(InvoiceRequest request, String message, String invoiceHtml, byte[] invoicePdf) {
        return QrInvoiceResponseDTO.builder()
                .requestId(request.getId())
                .orderId(request.getOrder().getId())
                .deliveryMethod(request.getDeliveryMethod().name())
                .status(request.getStatus().name())
                .companyName(request.getCompanyName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .message(message)
                .invoiceHtml(invoiceHtml)
                .invoicePdfBase64(invoicePdf == null ? null : Base64.getEncoder().encodeToString(invoicePdf))
                .createdAt(request.getCreatedAt())
                .build();
    }

    private boolean sendInvoiceEmailIfConfigured(InvoiceRequest request, String invoiceHtml) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null || !StringUtils.hasText(mailFrom)) {
            return false;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFrom.trim());
            helper.setTo(request.getEmail());
            helper.setSubject("Hóa đơn GTGT - Đơn #" + request.getOrder().getId());
            helper.setText(invoiceHtml, true);
            helper.addAttachment(
                    "hoa-don-don-" + request.getOrder().getId() + ".pdf",
                    new ByteArrayResource(invoicePdfService.generatePdf(invoiceHtml)),
                    "application/pdf"
            );
            mailSender.send(message);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    @Override
    public StaffCallDTO callStaff(String qrToken, QrStaffCallDTO callDTO) {
        DiningTable table = validateAndGetTable(qrToken);
        String tableName = table.getName();

        staffCallRepository.findTopByTableNameOrderByCreatedAtDesc(tableName).ifPresent(last -> {
            if (last.getCreatedAt() != null) {
                Duration since = Duration.between(last.getCreatedAt(), java.time.LocalDateTime.now());
                if (since.getSeconds() < 20) {
                    throw new BadRequestException("Bạn vừa gọi nhân viên, vui lòng chờ một chút rồi thử lại");
                }
            }
        });

        StaffCall call = StaffCall.builder()
                .tableName(tableName)
                .message(callDTO != null ? callDTO.getMessage() : null)
                .build();

        StaffCall saved = staffCallRepository.save(call);
        StaffCallDTO dto = StaffCallDTO.builder()
                .id(saved.getId())
                .tableName(saved.getTableName())
                .message(saved.getMessage())
                .createdAt(saved.getCreatedAt())
                .build();

        messagingTemplate.convertAndSend("/topic/staff-calls", dto);
        return dto;
    }

    private void validateInventoryAvailability(List<OrderItem> orderItems) {
        Map<Long, BigDecimal> requiredByIngredient = new HashMap<>();

        for (OrderItem orderItem : orderItems) {
            List<Recipe> recipes = recipeRepository.findByMenuItemId(orderItem.getMenuItem().getId());
            for (Recipe recipe : recipes) {
                BigDecimal required = recipe.getQuantity()
                        .multiply(BigDecimal.valueOf(orderItem.getQuantity()));
                requiredByIngredient.merge(recipe.getIngredient().getId(), required, BigDecimal::add);
            }
        }

        for (Map.Entry<Long, BigDecimal> entry : requiredByIngredient.entrySet()) {
            Long ingredientId = entry.getKey();
            BigDecimal required = entry.getValue();

            Inventory inventory = inventoryRepository.findByIngredientIdForUpdate(ingredientId)
                    .orElseThrow(() -> new ResourceNotFoundException("Inventory", "ingredientId", ingredientId));

            if (inventory.getQuantity().compareTo(required) < 0) {
                throw new InsufficientStockException(
                        "Insufficient stock for ingredient: " + inventory.getIngredient().getName()
                                + ". Available: " + inventory.getQuantity()
                                + ", Required: " + required);
            }
        }
    }

    private String normalizeCustomerPhone(String customerPhone) {
        if (customerPhone == null) {
            return null;
        }
        String normalized = customerPhone.replaceAll("\\s+", "").trim();
        if (normalized.isEmpty()) {
            return null;
        }
        if (!normalized.matches("^[+0-9][0-9]{8,19}$")) {
            throw new BadRequestException("Số điện thoại không hợp lệ");
        }
        return normalized;
    }

    private String normalizeCustomerPhoneForPreview(String customerPhone) {
        if (customerPhone == null || customerPhone.isBlank()) {
            return null;
        }
        return normalizeCustomerPhone(customerPhone);
    }

    private String normalizeSessionId(String clientSessionId) {
        if (clientSessionId == null || clientSessionId.isBlank()) {
            throw new BadRequestException("Phiên QR không hợp lệ");
        }
        String sid = clientSessionId.trim();
        if (sid.length() < 8 || sid.length() > 64 || !sid.matches("[a-zA-Z0-9\\-]+")) {
            throw new BadRequestException("Phiên QR không hợp lệ");
        }
        return sid;
    }

    private String normalizeOptionalSessionId(String clientSessionId) {
        if (clientSessionId == null || clientSessionId.isBlank()) {
            return null;
        }
        String sid = clientSessionId.trim();
        if (sid.length() < 8 || sid.length() > 64 || !sid.matches("[a-zA-Z0-9\\-]+")) {
            return null;
        }
        return sid;
    }

    private List<String> phoneLookupCandidates(String normalizedPhone) {
        List<String> candidates = new ArrayList<>();
        if (normalizedPhone == null || normalizedPhone.isBlank()) {
            return candidates;
        }
        candidates.add(normalizedPhone);
        if (normalizedPhone.startsWith("+84") && normalizedPhone.length() > 3) {
            candidates.add("0" + normalizedPhone.substring(3));
            candidates.add(normalizedPhone.substring(1));
        } else if (normalizedPhone.startsWith("84") && normalizedPhone.length() > 2) {
            candidates.add("0" + normalizedPhone.substring(2));
            candidates.add("+" + normalizedPhone);
        } else if (normalizedPhone.startsWith("0") && normalizedPhone.length() > 1) {
            candidates.add("84" + normalizedPhone.substring(1));
            candidates.add("+84" + normalizedPhone.substring(1));
        }
        return candidates.stream().distinct().toList();
    }

    private InvoiceRequest.DeliveryMethod parseInvoiceDeliveryMethod(String raw) {
        try {
            return InvoiceRequest.DeliveryMethod.valueOf(raw.trim().toUpperCase());
        } catch (Exception ex) {
            throw new BadRequestException("Cách nhận hóa đơn không hợp lệ");
        }
    }

    private String normalizeRequired(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.isEmpty()) {
            throw new BadRequestException("Thông tin xuất hóa đơn không được để trống");
        }
        return value;
    }

    private String resolveInvoiceMessage(InvoiceRequest.DeliveryMethod deliveryMethod, boolean emailSent) {
        return switch (deliveryMethod) {
            case DIRECT -> "Hóa đơn PDF đã sẵn sàng để xem, in hoặc tải về.";
            case EMAIL -> emailSent
                    ? "Đã gửi hóa đơn đến email khách cung cấp."
                    : "Đã ghi nhận yêu cầu gửi hóa đơn qua Gmail. Chưa cấu hình SMTP hoặc gửi lỗi, quầy sẽ xử lý lại.";
            case COUNTER -> "Đã ghi nhận yêu cầu lấy hóa đơn tại quầy. Vui lòng đọc mã đơn cho nhân viên.";
        };
    }

    private String buildInvoiceHtml(DiningTable table, Order order, QrInvoiceRequestDTO dto) {
        StringBuilder itemRows = new StringBuilder();
        for (OrderItem item : order.getOrderItems()) {
            itemRows.append("""
                    <tr>
                      <td>%s</td>
                      <td class="right">%s</td>
                      <td class="right">%s</td>
                      <td class="right">%s</td>
                    </tr>
                    """.formatted(
                    escapeHtml(invoiceItemName(item)),
                    item.getQuantity(),
                    money(item.getUnitPrice()),
                    money(item.getSubtotal())
            ));
        }
        BigDecimal subtotal = order.getSubtotalAmount() == null ? order.getTotalAmount() : order.getSubtotalAmount();
        BigDecimal discount = order.getDiscountAmount() == null ? BigDecimal.ZERO : order.getDiscountAmount();
        String discountLabel = order.getVoucherCode() == null || order.getVoucherCode().isBlank()
                ? "Giảm giá/ưu đãi"
                : "Voucher " + order.getVoucherCode();
        String discountDisplay = discount.compareTo(BigDecimal.ZERO) > 0 ? "-" + money(discount) : money(discount);
        String promotionNote = order.getPromotionNote() == null || order.getPromotionNote().isBlank()
                ? ""
                : """
                      <tr><td colspan="2" class="note">%s</td></tr>
                  """.formatted(escapeHtml(order.getPromotionNote()));
        String createdAt = order.getCreatedAt() == null
                ? ""
                : order.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        String requestedAt = java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));

        BigDecimal grossAmount = order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount();
        BigDecimal netAmount = grossAmount;
        BigDecimal vatAmount = BigDecimal.ZERO;
        BigDecimal safeVatRate = vatRatePercent != null ? vatRatePercent : new BigDecimal("8");
        
        if (priceIncludesVat) {
            BigDecimal divisor = BigDecimal.ONE.add(safeVatRate.divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP));
            netAmount = grossAmount.divide(divisor, 0, java.math.RoundingMode.HALF_UP);
            vatAmount = grossAmount.subtract(netAmount);
        } else {
            BigDecimal multiplier = safeVatRate.divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP);
            vatAmount = grossAmount.multiply(multiplier).setScale(0, java.math.RoundingMode.HALF_UP);
            grossAmount = grossAmount.add(vatAmount);
            netAmount = order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount();
        }

        return """
                <!DOCTYPE html>
                <html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
                <head>
                  <meta charset="UTF-8" />
                <title>Hoa don - Don #%s</title>
                  <style>
                    @page{size:A4;margin:16mm}
                    *{box-sizing:border-box}
                    body{font-family:Arial,sans-serif;margin:0;background:#ffffff;color:#111827}
                    .invoice{width:100%%;margin:0 auto;padding:0}
                    .store{text-align:center;font-size:26px;font-weight:800;letter-spacing:.4px;color:#7c2d12}
                    .title{text-align:center;font-size:20px;font-weight:700;margin-top:6px}
                    .muted{color:#6b7280;font-size:12px}.center{text-align:center}.right{text-align:right}
                    .line{border-top:2px solid #7c2d12;margin:18px 0}
                    table{width:100%%;border-collapse:collapse;table-layout:fixed}
                    .info td{padding:4px 0;font-size:13px;vertical-align:top}
                    .info .label{width:120px;color:#6b7280}
                    .info td:not(.label){word-break:break-word}
                    .items{margin-top:16px}
                    .items th{background:#fff7ed;color:#7c2d12;border-bottom:1px solid #fed7aa;padding:9px 8px;font-size:13px;text-align:left}
                    .items td{border-bottom:1px solid #e5e7eb;padding:9px 8px;font-size:13px;word-break:break-word}
                    .items th:nth-child(1),.items td:nth-child(1){width:45%%}
                    .items th:nth-child(2),.items td:nth-child(2){width:10%%}
                    .items th:nth-child(3),.items td:nth-child(3){width:20%%}
                    .items th:nth-child(4),.items td:nth-child(4){width:25%%}
                    .totals{width:300px;max-width:100%%;margin-left:auto;margin-top:16px;table-layout:auto}
                    .totals td{padding:6px 0;font-size:14px}
                    .note{font-size:12px;color:#047857;background:#ecfdf5;border-radius:8px;padding:7px 9px!important}
                    .grand td{border-top:1px solid #111827;padding-top:10px;font-size:18px;font-weight:800}
                    .footer{text-align:center;margin-top:26px;font-size:12px;color:#6b7280}
                  </style>
                </head>
                <body>
                  <div class="invoice">
                    <div class="store">%s</div>
                    <div class="title">HÓA ĐƠN THANH TOÁN</div>
                    <div class="center muted">Bản xuất từ QR Order</div>
                    <div class="line"></div>
                    <table class="info">
                      <tr><td class="label">Đơn hàng</td><td>#%s</td><td class="label">Thời gian lập</td><td>%s</td></tr>
                      <tr><td class="label">Bàn</td><td>%s</td><td class="label">Giờ xuất HĐ</td><td>%s</td></tr>
                      <tr><td class="label">Mã số thuế</td><td colspan="3">%s</td></tr>
                      <tr><td class="label">Tên công ty</td><td colspan="3">%s</td></tr>
                      <tr><td class="label">Địa chỉ</td><td colspan="3">%s</td></tr>
                      <tr><td class="label">Email</td><td>%s</td><td class="label">Điện thoại</td><td>%s</td></tr>
                    </table>
                    <table class="items">
                      <thead>
                        <tr><th>Món</th><th class="right">SL</th><th class="right">Đơn giá</th><th class="right">Thành tiền</th></tr>
                      </thead>
                      <tbody>%s</tbody>
                    </table>
                    <table class="totals">
                      <tr><td>Tạm tính</td><td class="right">%s</td></tr>
                      <tr><td>%s</td><td class="right">-%s</td></tr>
                      %s
                      <tr><td style="color:#6b7280;font-size:12px;">Giá trị trước thuế</td><td class="right" style="color:#6b7280;font-size:12px;">%s</td></tr>
                      <tr><td style="color:#6b7280;font-size:12px;padding-bottom:10px;">Thuế GTGT (%s%%)</td><td class="right" style="color:#6b7280;font-size:12px;padding-bottom:10px;">%s</td></tr>
                      <tr class="grand"><td>Tổng thanh toán</td><td class="right">%s</td></tr>
                    </table>
                    <div class="footer">Cảm ơn quý khách. Vui lòng lưu file PDF này để đối chiếu khi cần.</div>
                  </div>
                </body>
                </html>
                """.formatted(
                order.getId(),
                escapeHtml(storeName),
                order.getId(),
                escapeHtml(createdAt),
                escapeHtml(table.getName()),
                escapeHtml(requestedAt),
                escapeHtml(dto.getTaxCode()),
                escapeHtml(dto.getCompanyName()),
                escapeHtml(dto.getAddress()),
                escapeHtml(dto.getEmail()),
                escapeHtml(dto.getPhone()),
                itemRows,
                money(subtotal),
                escapeHtml(discountLabel),
                discountDisplay,
                promotionNote,
                money(netAmount),
                safeVatRate.setScale(0, java.math.RoundingMode.HALF_UP).toString(),
                money(vatAmount),
                money(grossAmount)
        );
    }

    private String invoiceItemName(OrderItem item) {
        StringBuilder name = new StringBuilder(item.getMenuItem().getName());
        List<String> details = new ArrayList<>();
        if (item.getSelectedSizeLabel() != null && !item.getSelectedSizeLabel().isBlank()) {
            details.add(item.getSelectedSizeLabel());
        }
        List<String> toppings = drinkOptionsJsonMapper.toppingSnapshotJsonToList(item.getSelectedToppingsJson()).stream()
                .map(OrderToppingLineDTO::getLabel)
                .filter(label -> label != null && !label.isBlank())
                .toList();
        details.addAll(toppings);
        if (!details.isEmpty()) {
            name.append(" (").append(String.join(" · ", details)).append(")");
        }
        return name.toString();
    }

    private String money(BigDecimal value) {
        BigDecimal safe = value == null ? BigDecimal.ZERO : value;
        return String.format("%,.0f đ", safe).replace(',', '.');
    }

    private String escapeHtml(String raw) {
        if (raw == null) return "";
        return raw.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
