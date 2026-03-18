package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.SalesDTO;
import C2SE._1.Capstone2.entity.*;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.DuplicateResourceException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.SalesMapper;
import C2SE._1.Capstone2.repository.*;
import C2SE._1.Capstone2.service.SalesService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class SalesServiceImpl implements SalesService {

    private final SalesTransactionRepository salesTransactionRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final SalesMapper salesMapper;
    @Value("${app.tax.vat.rate-percent:8}")
    private BigDecimal vatRatePercent;
    @Value("${app.tax.vat.price-includes-vat:true}")
    private boolean priceIncludesVat;

    @Override
    @Transactional(readOnly = true)
    public List<SalesDTO> getAllSales() {
        return salesMapper.toDTOList(salesTransactionRepository.findAll());
    }

    @Override
    @Transactional(readOnly = true)
    public SalesDTO getSaleById(Long id) {
        SalesTransaction sale = salesTransactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SalesTransaction", "id", id));
        return salesMapper.toDTO(sale);
    }

    @Override
    public SalesDTO createSale(SalesDTO salesDTO) {
        Order order = orderRepository.findById(salesDTO.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", salesDTO.getOrderId()));

        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new BadRequestException("Chỉ có thể tạo doanh thu cho đơn đã hoàn thành");
        }
        if (salesTransactionRepository.findByOrderId(order.getId()).isPresent()) {
            throw new DuplicateResourceException("Doanh thu cho đơn #" + order.getId() + " đã tồn tại");
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            throw new BadRequestException("Không xác định được thu ngân từ phiên đăng nhập");
        }
        User cashier = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", authentication.getName()));

        if (order.getOrderItems() == null || order.getOrderItems().isEmpty()) {
            throw new BadRequestException("Không thể tạo doanh thu cho đơn không có món");
        }

        SalesTransaction salesTransaction = SalesTransaction.builder()
                .order(order)
                .totalAmount(BigDecimal.ZERO)
                .netAmount(BigDecimal.ZERO)
                .vatRate(BigDecimal.ZERO)
                .vatAmount(BigDecimal.ZERO)
                .paymentMethod((salesDTO.getPaymentMethod() == null || salesDTO.getPaymentMethod().isBlank())
                        ? "CASH"
                        : salesDTO.getPaymentMethod().trim())
                .cashier(cashier)
                .build();

        List<SalesItem> salesItems = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (OrderItem orderItem : order.getOrderItems()) {
            SalesItem salesItem = SalesItem.builder()
                    .salesTransaction(salesTransaction)
                    .menuItem(orderItem.getMenuItem())
                    .quantity(orderItem.getQuantity())
                    .unitPrice(orderItem.getUnitPrice())
                    .subtotal(orderItem.getSubtotal())
                    .build();
            salesItems.add(salesItem);
            total = total.add(orderItem.getSubtotal());
        }

        BigDecimal rate = vatRatePercent.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
        BigDecimal netAmount;
        BigDecimal vatAmount;
        BigDecimal grossAmount;

        if (priceIncludesVat) {
            BigDecimal divisor = BigDecimal.ONE.add(rate);
            netAmount = total.divide(divisor, 0, RoundingMode.HALF_UP);
            vatAmount = total.subtract(netAmount);
            grossAmount = total;
        } else {
            netAmount = total;
            vatAmount = netAmount.multiply(rate).setScale(0, RoundingMode.HALF_UP);
            grossAmount = netAmount.add(vatAmount);
        }

        salesTransaction.setNetAmount(netAmount);
        salesTransaction.setVatRate(vatRatePercent);
        salesTransaction.setVatAmount(vatAmount);
        salesTransaction.setTotalAmount(grossAmount);
        salesTransaction.setSalesItems(salesItems);
        return salesMapper.toDTO(salesTransactionRepository.save(salesTransaction));
    }
}
