package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.SalesDTO;
import C2SE._1.Capstone2.dto.SalesItemDTO;
import C2SE._1.Capstone2.entity.*;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.SalesMapper;
import C2SE._1.Capstone2.repository.*;
import C2SE._1.Capstone2.service.SalesService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class SalesServiceImpl implements SalesService {

    private final SalesTransactionRepository salesTransactionRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final MenuItemRepository menuItemRepository;
    private final SalesMapper salesMapper;

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
        User cashier = userRepository.findById(salesDTO.getCashierId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", salesDTO.getCashierId()));

        SalesTransaction salesTransaction = SalesTransaction.builder()
                .order(order)
                .totalAmount(salesDTO.getTotalAmount())
                .paymentMethod(salesDTO.getPaymentMethod())
                .cashier(cashier)
                .build();

        List<SalesItem> salesItems = new ArrayList<>();
        if (salesDTO.getSalesItems() != null) {
            for (SalesItemDTO itemDTO : salesDTO.getSalesItems()) {
                MenuItem menuItem = menuItemRepository.findById(itemDTO.getMenuItemId())
                        .orElseThrow(() -> new ResourceNotFoundException("MenuItem", "id", itemDTO.getMenuItemId()));

                SalesItem salesItem = SalesItem.builder()
                        .salesTransaction(salesTransaction)
                        .menuItem(menuItem)
                        .quantity(itemDTO.getQuantity())
                        .unitPrice(itemDTO.getUnitPrice())
                        .subtotal(itemDTO.getSubtotal())
                        .build();
                salesItems.add(salesItem);
            }
        }

        salesTransaction.setSalesItems(salesItems);
        return salesMapper.toDTO(salesTransactionRepository.save(salesTransaction));
    }
}
